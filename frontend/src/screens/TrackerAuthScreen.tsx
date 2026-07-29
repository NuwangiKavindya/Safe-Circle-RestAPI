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
import { globalStyles, COLORS } from '../styles/theme';

interface TrackerAuthScreenProps {
  trackerCode: string;
  setTrackerCode: (code: string) => void;
  loading: boolean;
  onVerifyTrackerCode: (codeStr?: string) => void;
  onNavigateWelcome: () => void;
}

export const TrackerAuthScreen: React.FC<TrackerAuthScreenProps> = ({
  trackerCode,
  setTrackerCode,
  loading,
  onVerifyTrackerCode,
  onNavigateWelcome,
}) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContentCenter}>
      <View style={globalStyles.subHeader}>
        <TouchableOpacity onPress={onNavigateWelcome} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={globalStyles.miniLogo} />
        <Text style={globalStyles.subTitle}>Safety Tracker Portal</Text>
      </View>

      <View style={globalStyles.formCard}>
        <Text style={styles.trackerIconBig}>🛡️</Text>
        <Text style={styles.trackerTitle}>Secure Access Portal</Text>
        <Text style={styles.formInstructions}>
          Enter the 6-digit secure access code shared by your circle member to establish a secure tracking connection.
        </Text>

        <Text style={globalStyles.inputLabel}>Circle Access Code</Text>
        <TextInput
          placeholder="000000"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          maxLength={6}
          style={[
            globalStyles.input,
            { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 'bold' },
          ]}
          value={trackerCode}
          onChangeText={setTrackerCode}
        />

        <TouchableOpacity
          style={[
            globalStyles.primaryButton,
            { backgroundColor: COLORS.accentGreen },
            loading && globalStyles.disabledButton,
          ]}
          onPress={() => onVerifyTrackerCode()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Establish Tracking Connection</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  trackerIconBig: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  trackerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  formInstructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
});
