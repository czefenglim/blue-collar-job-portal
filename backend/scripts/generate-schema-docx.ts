
import * as fs from 'fs';
import * as path from 'path';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, HeadingLevel, BorderStyle } from 'docx';

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const OUTPUT_PATH = path.join(__dirname, '../../docs/database_schema.docx');

interface Field {
    name: string;
    type: string;
    isOptional: boolean;
    isList: boolean;
    attributes: string[];
    description: string;
    isPK: boolean;
    isFK: boolean;
}

interface Model {
    name: string;
    fields: Field[];
    description?: string;
}

function parseSchema(schemaContent: string): Model[] {
    const models: Model[] = [];
    const lines = schemaContent.split('\n');
    let currentModel: Model | null = null;
    let commentBuffer: string[] = [];

    // First pass: Parse models and fields
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('///')) {
            commentBuffer.push(line.replace('///', '').trim());
            continue;
        }

        if (line.startsWith('model ')) {
            const match = line.match(/^model\s+(\w+)\s+\{/);
            if (match) {
                currentModel = {
                    name: match[1],
                    fields: [],
                    description: commentBuffer.join(' '),
                };
                models.push(currentModel);
                commentBuffer = [];
            }
            continue;
        }

        if (line.startsWith('}')) {
            currentModel = null;
            commentBuffer = [];
            continue;
        }

        if (currentModel && line) {
            // Ignore block attributes @@
            if (line.startsWith('@@')) continue;
            // Ignore comments //
            if (line.startsWith('//')) continue;

            // Parse field: name type attributes
            // Example: id Int @id @default(autoincrement())
            // Example: email String @unique // comment
            
            // Remove trailing comments
            const cleanLine = line.split('//')[0].trim();
            if (!cleanLine) continue;

            const parts = cleanLine.split(/\s+/);
            if (parts.length < 2) continue;

            const name = parts[0];
            const rawType = parts[1];
            const attributes = parts.slice(2);

            const isOptional = rawType.endsWith('?');
            const isList = rawType.endsWith('[]');
            const type = rawType.replace('?', '').replace('[]', '');

            const isPK = attributes.some(attr => attr.startsWith('@id'));
            
            // Description from buffer or inline comment
            let description = commentBuffer.join(' ');
            const inlineComment = line.split('//')[1];
            if (inlineComment) {
                description = description ? `${description}. ${inlineComment.trim()}` : inlineComment.trim();
            }
            // Fallback description
            if (!description) {
                description = `Field for ${name}`;
            }

            currentModel.fields.push({
                name,
                type,
                isOptional,
                isList,
                attributes,
                description,
                isPK,
                isFK: false, // Will determine in second pass
            });
            commentBuffer = [];
        }
    }

    // Second pass: Identify FKs
    models.forEach(model => {
        model.fields.forEach(field => {
            // Check if this field defines a relation using @relation(fields: [x])
            const relationAttr = field.attributes.find(attr => attr.startsWith('@relation'));
            if (relationAttr) {
                const match = relationAttr.match(/fields:\s*\[([^\]]+)\]/);
                if (match) {
                    const fkFieldNames = match[1].split(',').map(s => s.trim());
                    fkFieldNames.forEach(fkName => {
                        const fkField = model.fields.find(f => f.name === fkName);
                        if (fkField) {
                            fkField.isFK = true;
                            // Update description if generic
                            if (fkField.description === `Field for ${fkName}`) {
                                fkField.description = `Foreign key referencing ${field.type}`;
                            }
                        }
                    });
                }
            }
        });
    });

    // Filter out relation object fields (fields that are not scalars but relations)
    // We want to keep them if they are useful, but typically schema docs show columns.
    // The user's image shows "verified_patient_info" which looks like a FK column.
    // In Prisma, "user User @relation..." is the relation object, "userId Int" is the FK column.
    // We usually document the columns (scalars).
    // However, sometimes we want to show the relationship.
    // Let's filter out fields where the type is another Model Name, UNLESS it's an enum.
    // But we don't know which types are Enums vs Models easily without parsing Enums too.
    // Heuristic: If it has @relation, it's a relation object field (not a DB column usually, unless embedded).
    // If it has @relation, we should probably hide it and only show the scalar FK field.
    // Wait, the user image shows `verified_patient_info` with type `Char` and FK.
    // This maps to the SCALAR field in Prisma (e.g. `patient_id`).
    // So we should HIDE the relation object fields (e.g. `user`, `company`) and SHOW the scalar fields (`userId`, `companyId`).
    
    // Let's identify model names to filter them out
    const modelNames = new Set(models.map(m => m.name));
    
    models.forEach(model => {
        model.fields = model.fields.filter(field => {
            // If field type is a Model, it's likely a relation object.
            // Exception: Enums are also custom types but we want to show them.
            // So if type is in modelNames, and it's not a scalar array (List), it's a relation object.
            // Actually, even if it is a list `User[]`, it's a relation.
            // We only want actual columns.
            // Prisma relation fields (virtual) usually have @relation or link to another model.
            // If we filter out all fields where Type is a Model, we are good.
            // But we need to keep Scalar fields.
            // Standard scalars: String, Int, Boolean, DateTime, Float, Decimal, BigInt, Bytes, Json.
            const scalars = ['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Decimal', 'BigInt', 'Bytes', 'Json'];
            
            // If it's a known scalar, keep it.
            if (scalars.includes(field.type)) return true;
            
            // If it's a model, drop it (it's a virtual relation field).
            if (modelNames.has(field.type)) return false;
            
            // If it's not scalar and not a model, it's likely an Enum. Keep it.
            return true;
        });
    });

    return models;
}

async function generateDocx(models: Model[]) {
    const children: any[] = [
        new Paragraph({
            text: "Database Schema Documentation",
            heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
            text: "",
        }),
    ];

    for (const model of models) {
        children.push(
            new Paragraph({
                text: `Table: ${model.name}`,
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                text: model.description || `Table for ${model.name}`,
                spacing: { after: 200 },
            })
        );

        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ text: "Attribute Name", style: "Strong" })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        shading: { fill: "E0E0E0" },
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: "Description", style: "Strong" })],
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        shading: { fill: "E0E0E0" },
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: "Data Type", style: "Strong" })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        shading: { fill: "E0E0E0" },
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: "PK/FK/NULL/NOT NULL", style: "Strong" })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        shading: { fill: "E0E0E0" },
                    }),
                ],
            }),
        ];

        for (const field of model.fields) {
            const constraints: string[] = [];
            if (field.isPK) constraints.push("PK");
            if (field.isFK) constraints.push("FK");
            if (field.isOptional) {
                // If PK, it's implicitly not null, but usually we just say PK.
                // If FK, it can be null.
                if (!field.isPK) constraints.push("NULL");
            } else {
                 if (!field.isPK) constraints.push("NOT NULL");
            }
            
            // Clean up constraints: if PK, assume NOT NULL implied, but user example says "PK".
            // If FK and NOT NULL -> "FK, NOT NULL".
            
            const constraintText = constraints.join(", ");

            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph(field.name)],
                        }),
                        new TableCell({
                            children: [new Paragraph(field.description)],
                        }),
                        new TableCell({
                            children: [new Paragraph(field.type)],
                        }),
                        new TableCell({
                            children: [new Paragraph(constraintText)],
                        }),
                    ],
                })
            );
        }

        children.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({ text: "" }) // Spacer
        );
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    // Ensure docs directory exists
    const docsDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, buffer);
    console.log(`Document generated at ${OUTPUT_PATH}`);
}

// Run
try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    const models = parseSchema(schemaContent);
    generateDocx(models).catch(console.error);
} catch (error) {
    console.error("Error:", error);
}
