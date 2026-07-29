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
import { UserData } from '../types';
import { globalStyles, COLORS } from '../styles/theme';

interface GooglePhoneRegisterScreenProps {
  user: UserData | null;
  googlePhoneInput: string;
  setGooglePhoneInput: (phone: string) => void;
  loading: boolean;
  onUpdateGooglePhone: () => void;
  onCancel: () => void;
}

export const GooglePhoneRegisterScreen: React.FC<GooglePhoneRegisterScreenProps> = ({
  user,
  googlePhoneInput,
  setGooglePhoneInput,
  loading,
  onUpdateGooglePhone,
  onCancel,
}) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContent}>
      <View style={globalStyles.subHeader}>
        <TouchableOpacity onPress={onCancel} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={globalStyles.miniLogo} />
        <Text style={globalStyles.subTitle}>Complete Profile</Text>
      </View>

      <View style={globalStyles.formCard}>
        <View style={styles.googleBrandHeader}>
          <Text style={styles.googleBrandLogo}>Google Account Verified</Text>
          <Text style={styles.googleBrandTitle}>Phone Number Required</Text>
          <Text style={styles.googleBrandSubheading}>
            Welcome, {user?.fullName || 'User'}! Please register your mobile number to complete
            your profile and enable emergency alert notifications.
          </Text>
        </View>

        <Text style={globalStyles.inputLabel}>Mobile Phone Number</Text>
        <TextInput
          placeholder="+1234567890"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          style={globalStyles.input}
          value={googlePhoneInput}
          onChangeText={setGooglePhoneInput}
        />

        <TouchableOpacity
          style={[globalStyles.primaryButton, loading && globalStyles.disabledButton]}
          onPress={onUpdateGooglePhone}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Complete Registration</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  googleBrandHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  googleBrandLogo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  googleBrandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  googleBrandSubheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
