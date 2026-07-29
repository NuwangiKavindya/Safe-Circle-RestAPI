import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { PasswordInput } from '../components/PasswordInput';
import { SignUpFormState } from '../types';
import { globalStyles, COLORS } from '../styles/theme';

interface SignUpScreenProps {
  signUpForm: SignUpFormState;
  setSignUpForm: React.Dispatch<React.SetStateAction<SignUpFormState>>;
  showSignUpPassword: boolean;
  setShowSignUpPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showSignUpConfirmPassword: boolean;
  setShowSignUpConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  onLocalRegister: () => void;
  onNavigateWelcome: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  signUpForm,
  setSignUpForm,
  showSignUpPassword,
  setShowSignUpPassword,
  showSignUpConfirmPassword,
  setShowSignUpConfirmPassword,
  loading,
  onLocalRegister,
  onNavigateWelcome,
}) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContent}>
      <View style={globalStyles.subHeader}>
        <TouchableOpacity onPress={onNavigateWelcome} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={globalStyles.miniLogo} />
        <Text style={globalStyles.subTitle}>Create Account</Text>
      </View>

      <View style={globalStyles.formCard}>
        <Text style={globalStyles.inputLabel}>Full Name</Text>
        <TextInput
          placeholder="John Doe"
          placeholderTextColor={COLORS.textMuted}
          style={globalStyles.input}
          value={signUpForm.fullName}
          onChangeText={text => setSignUpForm(prev => ({ ...prev, fullName: text }))}
        />

        <Text style={globalStyles.inputLabel}>Email Address</Text>
        <TextInput
          placeholder="john.doe@example.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={globalStyles.input}
          value={signUpForm.email}
          onChangeText={text => setSignUpForm(prev => ({ ...prev, email: text }))}
        />

        <Text style={globalStyles.inputLabel}>Phone Number</Text>
        <TextInput
          placeholder="+1234567890"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          style={globalStyles.input}
          value={signUpForm.phoneNumber}
          onChangeText={text => setSignUpForm(prev => ({ ...prev, phoneNumber: text }))}
        />

        <Text style={globalStyles.inputLabel}>Password</Text>
        <PasswordInput
          placeholder="Minimum 6 characters"
          value={signUpForm.password}
          onChangeText={text => setSignUpForm(prev => ({ ...prev, password: text }))}
          showPassword={showSignUpPassword}
          onToggleShowPassword={() => setShowSignUpPassword(prev => !prev)}
        />

        <Text style={globalStyles.inputLabel}>Confirm Password</Text>
        <PasswordInput
          placeholder="Repeat password"
          value={signUpForm.confirmPassword}
          onChangeText={text => setSignUpForm(prev => ({ ...prev, confirmPassword: text }))}
          showPassword={showSignUpConfirmPassword}
          onToggleShowPassword={() => setShowSignUpConfirmPassword(prev => !prev)}
        />

        <TouchableOpacity
          style={[globalStyles.primaryButton, loading && globalStyles.disabledButton]}
          onPress={onLocalRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Register User</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
