import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

interface PasswordInputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  placeholder = 'Enter password',
  value,
  onChangeText,
  showPassword,
  onToggleShowPassword,
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry={!showPassword}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity style={styles.toggleBtn} onPress={onToggleShowPassword}>
        <Text style={styles.toggleText}>{showPassword ? '🙈' : '👁️'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 18,
  },
});
