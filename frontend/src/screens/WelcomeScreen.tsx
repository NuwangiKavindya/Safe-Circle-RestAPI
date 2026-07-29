import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { PasswordInput } from '../components/PasswordInput';
import { SignInFormState } from '../types';
import { globalStyles, COLORS } from '../styles/theme';

interface WelcomeScreenProps {
  signInForm: SignInFormState;
  setSignInForm: React.Dispatch<React.SetStateAction<SignInFormState>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  onLocalLogin: () => void;
  onNativeGoogleLogin: () => void;
  onNavigateSignUp: () => void;
  onNavigateTrackerAuth: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  signInForm,
  setSignInForm,
  showPassword,
  setShowPassword,
  loading,
  onLocalLogin,
  onNativeGoogleLogin,
  onNavigateSignUp,
  onNavigateTrackerAuth,
}) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContentCenter}>
      <View style={styles.heroSection}>
        <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
        <Text style={styles.title}>SafeCircle</Text>
        <Text style={styles.tagline}>Smart Personal Security System</Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* Email/Password Login Card */}
        <View style={styles.loginCard}>
          <Text style={styles.loginCardHeading}>Sign In</Text>

          <Text style={globalStyles.inputLabel}>Email Address</Text>
          <TextInput
            placeholder="name@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={globalStyles.input}
            value={signInForm.email}
            onChangeText={text => setSignInForm(prev => ({ ...prev, email: text }))}
          />

          <Text style={globalStyles.inputLabel}>Password</Text>
          <PasswordInput
            placeholder="Enter your password"
            value={signInForm.password}
            onChangeText={text => setSignInForm(prev => ({ ...prev, password: text }))}
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword(prev => !prev)}
          />

          <TouchableOpacity
            style={[globalStyles.primaryButton, loading && globalStyles.disabledButton]}
            onPress={onLocalLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={globalStyles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={onNativeGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={globalStyles.secondaryButton} onPress={onNavigateSignUp}>
          <Text style={globalStyles.secondaryButtonText}>Create Local Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.secondaryButton, { borderColor: COLORS.accentGreen, marginTop: -8 }]}
          onPress={onNavigateTrackerAuth}
        >
          <Text style={[globalStyles.secondaryButtonText, { color: '#34D399' }]}>
            🛡️ Circle Member Tracker Portal
          </Text>
        </TouchableOpacity>

        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>Backend Port: 5001</Text>
          <Text style={styles.metaText}>Status: Connected to Database</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '400',
  },
  buttonContainer: {
    width: '100%',
  },
  loginCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 24,
  },
  loginCardHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderDark,
  },
  dividerText: {
    color: COLORS.textMuted,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: COLORS.textPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  googleButtonText: {
    color: COLORS.bgDark,
    fontSize: 16,
    fontWeight: '700',
  },
  metaInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  metaText: {
    color: '#475569',
    fontSize: 12,
    marginVertical: 2,
  },
});
