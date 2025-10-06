import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
  style?: any;
}

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh', label: '中文', name: '中文' },
  { code: 'ms', label: 'BM', name: 'Bahasa Melayu' },
  { code: 'ta', label: 'தமிழ்', name: 'தமிழ்' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ style }) => {
  const { currentLanguage, changeLanguage } = useLanguage();

  return (
    <View style={[styles.container, style]}>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.langButton,
            currentLanguage === lang.code && styles.langButtonActive,
          ]}
          onPress={() => changeLanguage(lang.code)}
        >
          <Text
            style={[
              styles.langButtonText,
              currentLanguage === lang.code && styles.langButtonTextActive,
            ]}
          >
            {lang.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langButtonActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  langButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  langButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default LanguageSelector;
