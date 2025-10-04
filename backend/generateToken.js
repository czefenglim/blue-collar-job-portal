const jwt = require('jsonwebtoken');

// Replace with your actual secret (must match process.env.JWT_SECRET in your app)
const secret =
  'a2579ab20d8b7fece531824ecaf62b060ff13dc49b5530c99fca0395471264b9b1e2ec000681baa7d3acc462a985d287570a92c7dd2b107e2a12c9ed70451953'; // or process.env.JWT_SECRET if set

const token = jwt.sign(
  {
    userId: 10, // mock user id
    email: 'hhh@gmail.com', // mock email
  },
  secret,
  { expiresIn: '30d' }
);

console.log('Generated JWT token:\n', token);
console.log(process.env.JWT_SECRET);
