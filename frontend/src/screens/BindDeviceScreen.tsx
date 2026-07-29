import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { DeviceFormState } from '../types';
import { globalStyles, COLORS } from '../styles/theme';

interface BindDeviceScreenProps {
  deviceForm: DeviceFormState;
  setDeviceForm: React.Dispatch<React.SetStateAction<DeviceFormState>>;
  loading: boolean;
  onBindDevice: () => void;
  onAutoDetect: () => void;
  onNavigateDashboard: () => void;
}

export const BindDeviceScreen: React.FC<BindDeviceScreenProps> = ({
  deviceForm,
  setDeviceForm,
  loading,
  onBindDevice,
  onAutoDetect,
  onNavigateDashboard,
}) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContent}>
      <View style={globalStyles.subHeader}>
        <TouchableOpacity onPress={onNavigateDashboard} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={globalStyles.subTitle}>Link Device</Text>
      </View>

      <View style={globalStyles.formCard}>
        <Text style={styles.formInstructions}>
          Register your IMEI number to bind your hardware module with the security center.
        </Text>

        <TouchableOpacity style={styles.autoDetectButton} onPress={onAutoDetect}>
          <Text style={styles.autoDetectButtonText}>✨ Auto-detect Current Device</Text>
        </TouchableOpacity>

        <Text style={globalStyles.inputLabel}>Device Custom Name</Text>
        <TextInput
          placeholder="e.g. My Primary Phone"
          placeholderTextColor={COLORS.textMuted}
          style={globalStyles.input}
          value={deviceForm.deviceName}
          onChangeText={text => setDeviceForm(prev => ({ ...prev, deviceName: text }))}
        />

        <Text style={globalStyles.inputLabel}>Device Model</Text>
        <TextInput
          placeholder="e.g. iPhone 15 Pro Max"
          placeholderTextColor={COLORS.textMuted}
          style={globalStyles.input}
          value={deviceForm.deviceModel}
          onChangeText={text => setDeviceForm(prev => ({ ...prev, deviceModel: text }))}
        />

        <Text style={globalStyles.inputLabel}>IMEI / Serial Number</Text>
        <TextInput
          placeholder="15-digit unique serial number"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          style={globalStyles.input}
          value={deviceForm.imeiNumber}
          onChangeText={text => setDeviceForm(prev => ({ ...prev, imeiNumber: text }))}
        />

        <Text style={globalStyles.inputLabel}>Operating System</Text>
        <View style={globalStyles.tabContainer}>
          <TouchableOpacity
            style={[
              globalStyles.tabButton,
              deviceForm.deviceOs === 'Android' && globalStyles.tabButtonActive,
            ]}
            onPress={() => setDeviceForm(prev => ({ ...prev, deviceOs: 'Android' }))}
          >
            <Text
              style={[
                globalStyles.tabButtonText,
                deviceForm.deviceOs === 'Android' && globalStyles.tabButtonTextActive,
              ]}
            >
              Android
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              globalStyles.tabButton,
              deviceForm.deviceOs === 'iOS' && globalStyles.tabButtonActive,
            ]}
            onPress={() => setDeviceForm(prev => ({ ...prev, deviceOs: 'iOS' }))}
          >
            <Text
              style={[
                globalStyles.tabButtonText,
                deviceForm.deviceOs === 'iOS' && globalStyles.tabButtonTextActive,
              ]}
            >
              iOS
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[globalStyles.primaryButton, loading && globalStyles.disabledButton]}
          onPress={onBindDevice}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Register and Link IMEI</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  formInstructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  autoDetectButton: {
    backgroundColor: COLORS.indigoBg,
    borderWidth: 1,
    borderColor: COLORS.indigoBorder,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  autoDetectButtonText: {
    color: COLORS.indigoText,
    fontSize: 13,
    fontWeight: '600',
  },
});
