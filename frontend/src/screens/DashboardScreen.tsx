import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { DeviceCard } from '../components/DeviceCard';
import { ContactCard } from '../components/ContactCard';
import { MapViewComponent } from '../components/MapViewComponent';
import { UserData, BoundDevice, TrustedContact, ApiAlert } from '../types';
import { globalStyles, COLORS } from '../styles/theme';

interface DashboardScreenProps {
  user: UserData | null;
  devices: BoundDevice[];
  contacts: TrustedContact[];
  activeAlert: ApiAlert | null;
  pulseAnim: Animated.Value;
  loading: boolean;
  onLogOut: () => void;
  onTriggerSos: () => void;
  onResolveAlert: () => void;
  onUploadAmbientAudio: () => void;
  onNavigateBindDevice: () => void;
  onNavigateAddContact: () => void;
  onUnbindDevice: (deviceId: string) => void;
  onDeleteContact: (contactId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  devices,
  contacts,
  activeAlert,
  pulseAnim,
  loading,
  onLogOut,
  onTriggerSos,
  onResolveAlert,
  onUploadAmbientAudio,
  onNavigateBindDevice,
  onNavigateAddContact,
  onUnbindDevice,
  onDeleteContact,
}) => {
  // Use mock primary location coords for map preview on user dashboard
  const primaryLat = activeAlert && activeAlert.latitude ? parseFloat(String(activeAlert.latitude)) : 37.7749;
  const primaryLng = activeAlert && activeAlert.longitude ? parseFloat(String(activeAlert.longitude)) : -122.4194;

  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContent}>
      {/* Dashboard Header */}
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.profileNameText}>{user?.fullName || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogOut}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Info Summary */}
      <View style={styles.profileSummaryCard}>
        <Text style={styles.profileSummaryText}>📧 {user?.email}</Text>
        {user?.phoneNumber ? (
          <Text style={styles.profileSummaryText}>📱 {user.phoneNumber}</Text>
        ) : (
          <Text style={styles.profileSummaryText}>🌐 Logged in with Google</Text>
        )}
      </View>

      {/* Emergency SOS Center */}
      <View style={styles.sosContainer}>
        {activeAlert ? (
          <>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.sosButton,
                  { backgroundColor: COLORS.accentRedBg, borderColor: COLORS.accentRed },
                ]}
                disabled
              >
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.trackingStatusText, { color: COLORS.accentRed, marginBottom: 8 }]}>
              🚨 Active SOS Broadcast Running
            </Text>

            {/* Ambient Audio Capture Section */}
            <View style={styles.audioRecordCard}>
              <View style={styles.audioRecordRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.audioRecordHeading}>Recording Ambient Audio...</Text>
              </View>
              <Text style={styles.audioRecordText}>
                {activeAlert.audioFileUrl
                  ? '✅ Safety ambient recording uploaded and shared with circle contacts.'
                  : '🎙️ Generating and uploading environment sound clip...'}
              </Text>

              <TouchableOpacity
                style={styles.recordManualButton}
                onPress={onUploadAmbientAudio}
                disabled={loading}
              >
                <Text style={styles.recordManualButtonText}>
                  {loading ? 'Uploading Snapshot...' : '🎙️ Upload New Audio Snapshot'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                globalStyles.primaryButton,
                { backgroundColor: COLORS.accentGreen, marginTop: 16, paddingHorizontal: 24 },
              ]}
              onPress={onResolveAlert}
            >
              <Text style={globalStyles.primaryButtonText}>✅ I am Safe - Resolve SOS</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={styles.sosButton} onPress={onTriggerSos}>
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.trackingStatusText}>🟢 System Online & Tracking</Text>
          </>
        )}
      </View>

      {/* Interactive Map Section */}
      <View style={styles.devicesSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Live Geolocation Map</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>Active GPS</Text>
          </View>
        </View>
        <MapViewComponent
          latitude={primaryLat}
          longitude={primaryLng}
          accuracy={10.0}
          logs={[
            { latitude: primaryLat, longitude: primaryLng, timestamp: new Date().toISOString() },
            { latitude: primaryLat + 0.002, longitude: primaryLng + 0.002, timestamp: new Date(Date.now() - 30000).toISOString() },
          ]}
          targetName={user?.fullName || 'Primary Device'}
          height={260}
        />
      </View>

      {/* Devices Section */}
      <View style={styles.devicesSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Devices</Text>
          <TouchableOpacity style={styles.addButtonMini} onPress={onNavigateBindDevice}>
            <Text style={styles.addButtonMiniText}>+ Bind</Text>
          </TouchableOpacity>
        </View>

        {devices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTextIcon}>📱</Text>
            <Text style={styles.emptyText}>No device registered to this account.</Text>
            <TouchableOpacity style={styles.linkButton} onPress={onNavigateBindDevice}>
              <Text style={styles.linkButtonText}>Register current device now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          devices.map((device, index) => (
            <DeviceCard key={device.id || index} device={device} onUnbind={onUnbindDevice} />
          ))
        )}
      </View>

      {/* Safety Circle Section */}
      <View style={styles.devicesSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Safety Circle</Text>
          <TouchableOpacity style={styles.addButtonMini} onPress={onNavigateAddContact}>
            <Text style={styles.addButtonMiniText}>+ Add Contact</Text>
          </TouchableOpacity>
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTextIcon}>👥</Text>
            <Text style={styles.emptyText}>No trusted contacts added yet.</Text>
            <TouchableOpacity style={styles.linkButton} onPress={onNavigateAddContact}>
              <Text style={styles.linkButtonText}>Add a trusted contact now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          contacts.map((contact, index) => (
            <ContactCard key={contact.id || index} contact={contact} onDelete={onDeleteContact} />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  profileNameText: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.indigoBg,
    borderWidth: 1,
    borderColor: '#3730A3',
  },
  logoutButtonText: {
    color: COLORS.indigoText,
    fontSize: 13,
    fontWeight: '600',
  },
  profileSummaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  profileSummaryText: {
    color: '#E2E8F0',
    fontSize: 14,
    marginVertical: 4,
  },
  sosContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  sosButton: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: COLORS.accentRed,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 1,
  },
  trackingStatusText: {
    color: COLORS.accentGreen,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 24,
  },
  devicesSection: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  addButtonMini: {
    backgroundColor: COLORS.accentPrimary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonMiniText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.cardBg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#475569',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTextIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  linkButtonText: {
    color: COLORS.accentCyan,
    fontSize: 14,
    fontWeight: '600',
  },
  audioRecordCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.accentRed,
    width: '100%',
    alignItems: 'center',
  },
  audioRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accentRed,
    marginRight: 8,
  },
  audioRecordHeading: {
    color: COLORS.accentRed,
    fontSize: 14,
    fontWeight: '700',
  },
  audioRecordText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  recordManualButton: {
    backgroundColor: COLORS.indigoBg,
    borderColor: COLORS.indigoBorder,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  recordManualButtonText: {
    color: COLORS.indigoText,
    fontSize: 12,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accentGreen,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGreen,
    marginRight: 6,
  },
  liveBadgeText: {
    color: COLORS.accentGreen,
    fontSize: 11,
    fontWeight: '700',
  },
});
