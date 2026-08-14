import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Switch,
} from 'react-native';
import { DeviceCard } from '../components/DeviceCard';
import { ContactCard } from '../components/ContactCard';
import { MapViewComponent } from '../components/MapViewComponent';
import { UserData, BoundDevice, TrustedContact, ApiAlert } from '../types';
import { SafeZone } from '../services/api';
import { LocationCoordinates } from '../services/locationService';
import { globalStyles, COLORS } from '../styles/theme';

import { SensitivityMode, SENSITIVITY_PROFILES } from '../services/motionService';

interface DashboardScreenProps {
  user: UserData | null;
  devices: BoundDevice[];
  contacts: TrustedContact[];
  safeZones?: SafeZone[];
  activeAlert: ApiAlert | null;
  liveLocation?: LocationCoordinates | null;
  isMotionGuardActive?: boolean;
  sensitivityMode?: SensitivityMode;
  liveEnergyLevel?: number;
  pulseAnim: Animated.Value;
  loading: boolean;
  onLogOut: () => void;
  onTriggerSos: () => void;
  onResolveAlert: () => void;
  onUploadAmbientAudio: () => void;
  onNavigateBindDevice: () => void;
  onNavigateAddContact: () => void;
  onNavigateFullScreenMap?: () => void;
  onFetchCurrentLocation?: () => void;
  onCreateSafeZone?: (zoneName: string, radiusMeters: number) => void;
  onDeleteSafeZone?: (safeZoneId: string) => void;
  onToggleMotionGuard?: (active: boolean) => void;
  onSelectSensitivityMode?: (mode: SensitivityMode) => void;
  onCalibrateBaseline?: () => void;
  onUnbindDevice: (deviceId: string) => void;
  onDeleteContact: (contactId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  devices,
  contacts,
  safeZones = [],
  activeAlert,
  liveLocation,
  isMotionGuardActive = false,
  sensitivityMode = 'POCKET_GUARD',
  liveEnergyLevel = 0,
  pulseAnim,
  loading,
  onLogOut,
  onTriggerSos,
  onResolveAlert,
  onUploadAmbientAudio,
  onNavigateBindDevice,
  onNavigateAddContact,
  onNavigateFullScreenMap,
  onFetchCurrentLocation,
  onCreateSafeZone,
  onDeleteSafeZone,
  onToggleMotionGuard,
  onSelectSensitivityMode,
  onCalibrateBaseline,
  onUnbindDevice,
  onDeleteContact,
}) => {
  // Safe Zone Form State
  const [newZoneName, setNewZoneName] = React.useState('');
  const [newZoneRadius, setNewZoneRadius] = React.useState(200);

  const handleCreateZoneSubmit = () => {
    if (!newZoneName.trim()) return;
    if (onCreateSafeZone) {
      onCreateSafeZone(newZoneName.trim(), newZoneRadius);
      setNewZoneName('');
    }
  };

  // Real-time live location coordinates with fallback to active alert
  const primaryLat = liveLocation?.latitude
    ? liveLocation.latitude
    : activeAlert && activeAlert.latitude
    ? parseFloat(String(activeAlert.latitude))
    : null;

  const primaryLng = liveLocation?.longitude
    ? liveLocation.longitude
    : activeAlert && activeAlert.longitude
    ? parseFloat(String(activeAlert.longitude))
    : null;

  const activeProfile = SENSITIVITY_PROFILES[sensitivityMode] || SENSITIVITY_PROFILES.POCKET_GUARD;

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

      {/* Motion Sensor Theft Protection Center Card */}
      <View style={[styles.profileSummaryCard, { backgroundColor: '#1E1B4B', borderColor: '#4F46E5', marginTop: 12 }]}>
        {/* Top Header & Switch Toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' }}>
                🛡️ Motion Theft Guard
              </Text>
              <View style={{
                marginLeft: 8,
                paddingVertical: 2,
                paddingHorizontal: 8,
                borderRadius: 10,
                backgroundColor: isMotionGuardActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                borderWidth: 1,
                borderColor: isMotionGuardActive ? COLORS.accentGreen : '#64748B',
              }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: isMotionGuardActive ? COLORS.accentGreen : COLORS.textSecondary }}>
                  {isMotionGuardActive ? 'ACTIVE' : 'OFF'}
                </Text>
              </View>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              {isMotionGuardActive
                ? `50Hz Motion Stream • Profile: ${activeProfile.icon} ${activeProfile.label}`
                : 'Tap switch to enable real-time motion anomaly protection'}
            </Text>
          </View>
          <Switch
            value={isMotionGuardActive}
            onValueChange={onToggleMotionGuard}
            trackColor={{ false: '#334155', true: COLORS.accentGreen }}
            thumbColor={isMotionGuardActive ? '#FFF' : '#94A3B8'}
          />
        </View>

        {/* Live Motion Energy Meter Bar (Visible when active) */}
        {isMotionGuardActive && (
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}>
                LIVE MOTION ENERGY METER
              </Text>
              <Text style={{
                color: liveEnergyLevel > 70 ? COLORS.accentRed : liveEnergyLevel > 35 ? '#FBBF24' : COLORS.accentGreen,
                fontSize: 11,
                fontWeight: '700',
              }}>
                {liveEnergyLevel}% {liveEnergyLevel > 70 ? '⚠️ HIGH SPIKE' : liveEnergyLevel > 35 ? '⚡ ACTIVE' : 'NORMAL'}
              </Text>
            </View>
            
            {/* Energy Progress Bar Track */}
            <View style={{ height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{
                height: '100%',
                width: `${Math.min(100, Math.max(5, liveEnergyLevel))}%`,
                backgroundColor: liveEnergyLevel > 70 ? COLORS.accentRed : liveEnergyLevel > 35 ? '#FBBF24' : COLORS.accentGreen,
                borderRadius: 3,
              }} />
            </View>

            {/* Sensitivity Profile Selection Pills */}
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 12, marginBottom: 8 }}>
              SENSITIVITY MODE PROFILE
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {(['TABLE_GUARD', 'POCKET_GUARD', 'ACTIVE_GUARD'] as SensitivityMode[]).map((mode) => {
                const profile = SENSITIVITY_PROFILES[mode];
                const isSelected = sensitivityMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={{
                      flex: 1,
                      marginHorizontal: 3,
                      paddingVertical: 8,
                      paddingHorizontal: 6,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: isSelected ? COLORS.indigoBorder : '#0F172A',
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.accentCyan : '#334155',
                    }}
                    onPress={() => onSelectSensitivityMode && onSelectSensitivityMode(mode)}
                  >
                    <Text style={{ fontSize: 14 }}>{profile.icon}</Text>
                    <Text style={{ color: isSelected ? '#FFF' : COLORS.textSecondary, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                      {profile.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calibrate Baseline Button */}
            {onCalibrateBaseline && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  borderWidth: 1,
                  borderColor: COLORS.accentCyan,
                  alignItems: 'center',
                }}
                onPress={onCalibrateBaseline}
              >
                <Text style={{ color: COLORS.accentCyan, fontSize: 12, fontWeight: '700' }}>
                  🎯 Calibrate Personal Motion Baseline
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onFetchCurrentLocation && (
              <TouchableOpacity
                style={[styles.addButtonMini, { marginRight: 6, backgroundColor: COLORS.cardBg, borderColor: COLORS.accentGreen }]}
                onPress={onFetchCurrentLocation}
              >
                <Text style={[styles.addButtonMiniText, { color: COLORS.accentGreen }]}>📍 My Location</Text>
              </TouchableOpacity>
            )}
            {onNavigateFullScreenMap && (
              <TouchableOpacity
                style={[styles.addButtonMini, { marginRight: 6, backgroundColor: COLORS.indigoBg, borderColor: COLORS.accentCyan }]}
                onPress={onNavigateFullScreenMap}
              >
                <Text style={[styles.addButtonMiniText, { color: COLORS.accentCyan }]}>⛶ Fullscreen</Text>
              </TouchableOpacity>
            )}
            <View style={styles.liveBadge}>
              <View style={styles.liveBadgeDot} />
              <Text style={styles.liveBadgeText}>Active GPS</Text>
            </View>
          </View>
        </View>
        <MapViewComponent
          latitude={primaryLat}
          longitude={primaryLng}
          accuracy={10.0}
          logs={
            primaryLat !== null && primaryLng !== null
              ? [{ latitude: primaryLat, longitude: primaryLng, timestamp: new Date().toISOString() }]
              : []
          }
          safeZones={safeZones}
          targetName={user?.fullName || 'Primary Device'}
          height={260}
          onExpandFullScreen={onNavigateFullScreenMap}
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

      {/* Safe Zones (Geofencing) Section */}
      <View style={styles.devicesSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Safe Zones (Geofencing)</Text>
          <View style={styles.liveBadge}>
            <View style={[styles.liveBadgeDot, { backgroundColor: COLORS.accentGreen }]} />
            <Text style={[styles.liveBadgeText, { color: COLORS.accentGreen }]}>
              {safeZones.length} Active
            </Text>
          </View>
        </View>

        {/* Quick Add Safe Zone Form Card */}
        <View style={[styles.profileSummaryCard, { marginBottom: 16 }]}>
          <Text style={[globalStyles.inputLabel, { color: COLORS.textPrimary, marginBottom: 10 }]}>
            🛡️ Create New Safe Zone
          </Text>

          <TextInput
            style={globalStyles.input}
            placeholder="Zone Name (e.g. Home, Campus, Work)"
            placeholderTextColor={COLORS.textMuted}
            value={newZoneName}
            onChangeText={setNewZoneName}
          />

          <Text style={[globalStyles.inputLabel, { marginBottom: 8 }]}>Select Radius Boundary:</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {[100, 200, 500].map((radius) => (
              <TouchableOpacity
                key={radius}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  marginHorizontal: 4,
                  borderRadius: 10,
                  backgroundColor: newZoneRadius === radius ? COLORS.indigoBg : COLORS.bgDark,
                  borderWidth: 1,
                  borderColor: newZoneRadius === radius ? COLORS.accentCyan : COLORS.borderDark,
                  alignItems: 'center',
                }}
                onPress={() => setNewZoneRadius(radius)}
              >
                <Text
                  style={{
                    color: newZoneRadius === radius ? COLORS.accentCyan : COLORS.textSecondary,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {radius}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[globalStyles.primaryButton, { backgroundColor: COLORS.accentGreen }]}
            onPress={handleCreateZoneSubmit}
          >
            <Text style={globalStyles.primaryButtonText}>🛡️ Set Safe Zone at Location</Text>
          </TouchableOpacity>
        </View>

        {/* Active Safe Zones List */}
        {safeZones.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTextIcon}>🛡️</Text>
            <Text style={styles.emptyText}>No safe zones configured yet.</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Create a safe zone above to enable geofence breach monitoring.
            </Text>
          </View>
        ) : (
          safeZones.map((zone, index) => (
            <View key={zone.id || index} style={styles.deviceListItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 22, marginRight: 12 }}>🛡️</Text>
                <View>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 }}>
                    {zone.zoneName}
                  </Text>
                  <Text style={{ color: COLORS.accentGreen, fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                    Radius: {zone.radiusMeters} meters • Status: Active
                  </Text>
                </View>
              </View>
              {onDeleteSafeZone && (
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => onDeleteSafeZone(zone.id)}
                >
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
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
  deviceListItem: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
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
