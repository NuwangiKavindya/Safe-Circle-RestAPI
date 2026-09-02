import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MapViewComponent } from '../components/MapViewComponent';
import { globalStyles, COLORS } from '../styles/theme';

interface TrackerDashboardScreenProps {
  trackerInfo: any;
  trackerLogs: any[];
  trackerAudioPlaying: boolean;
  audioProgress: number;
  onToggleAudioPlaying: () => void;
  onDisconnect: () => void;
  onNavigateFullScreenMap?: () => void;
}

export const TrackerDashboardScreen: React.FC<TrackerDashboardScreenProps> = ({
  trackerInfo,
  trackerLogs,
  trackerAudioPlaying,
  audioProgress,
  onToggleAudioPlaying,
  onDisconnect,
  onNavigateFullScreenMap,
}) => {
  if (!trackerInfo) return null;

  const currentLog = trackerLogs.length > 0 ? trackerLogs[0] : null;
  const currentLat = currentLog ? parseFloat(currentLog.latitude) : null;
  const currentLng = currentLog ? parseFloat(currentLog.longitude) : null;
  const accuracy = currentLog && currentLog.accuracy ? parseFloat(currentLog.accuracy) : null;

  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContent}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.welcomeText}>Incident Tracking</Text>
          <Text style={styles.profileNameText}>Security Center</Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: COLORS.accentRedDark, borderColor: COLORS.accentRed }]}
          onPress={onDisconnect}
        >
          <Text style={[styles.logoutButtonText, { color: '#FCA5A5' }]}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Distress Alert Status Banner */}
      <View
        style={[
          styles.bannerStatic,
          trackerInfo.isActiveSos
            ? { backgroundColor: COLORS.accentRedBg, borderColor: COLORS.accentRed }
            : { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' },
        ]}
      >
        <Text
          style={[
            styles.bannerStaticText,
            !trackerInfo.isActiveSos && { color: '#6EE7B7' },
          ]}
        >
          {trackerInfo.isActiveSos
            ? '🚨 EMERGENCY SOS BROADCAST ACTIVE'
            : '🌐 ALWAYS-ON CIRCLE MONITORING ACTIVE (User Safe)'}
        </Text>
      </View>

      {/* Target Individual Details Card */}
      <View style={styles.profileSummaryCard}>
        <Text style={[globalStyles.inputLabel, { color: COLORS.textPrimary, marginBottom: 8 }]}>
          Distressed Individual
        </Text>
        <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' }}>
          👤 {trackerInfo.targetUser.fullName}
        </Text>
        <Text style={[styles.profileSummaryText, { marginTop: 4 }]}>
          📞 Phone: {trackerInfo.targetUser.phoneNumber || 'N/A'}
        </Text>
        <Text style={styles.profileSummaryText}>
          🤝 Relationship: {trackerInfo.relationship}
        </Text>
      </View>

      {/* Interactive Native Map Visualization */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
        <Text style={globalStyles.inputLabel}>Native Map Location Stream</Text>
        {onNavigateFullScreenMap && (
          <TouchableOpacity
            style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: COLORS.indigoBg, borderWidth: 1, borderColor: COLORS.accentCyan }}
            onPress={onNavigateFullScreenMap}
          >
            <Text style={{ color: COLORS.accentCyan, fontSize: 12, fontWeight: '700' }}>⛶ Fullscreen</Text>
          </TouchableOpacity>
        )}
      </View>
      <MapViewComponent
        latitude={currentLat}
        longitude={currentLng}
        accuracy={accuracy}
        logs={trackerLogs}
        targetName={trackerInfo.targetUser.fullName}
        height={320}
        onExpandFullScreen={onNavigateFullScreenMap}
      />

      {/* Ambient SOS Audio Card */}
      {trackerInfo.audioFileUrl ? (
        <View style={[styles.profileSummaryCard, { backgroundColor: '#1E1B4B', borderColor: '#4F46E5' }]}>
          <Text style={[globalStyles.inputLabel, { color: '#C7D2FE', marginBottom: 8 }]}>
            🎙️ Ambient SOS Audio
          </Text>
          <View style={styles.audioPlayerRow}>
            <TouchableOpacity style={styles.playButtonCircle} onPress={onToggleAudioPlaying}>
              <Text style={styles.playButtonIcon}>
                {trackerAudioPlaying ? '⏸️' : '▶️'}
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 }}>
                {trackerAudioPlaying
                  ? 'Streaming Ambient Recording...'
                  : 'Ambient Recording Available'}
              </Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${audioProgress}%` }]} />
              </View>
            </View>
          </View>
          {trackerAudioPlaying && (
            <View style={styles.waveContainer}>
              <View style={[styles.waveBar, { height: 12 + Math.random() * 12 }]} />
              <View style={[styles.waveBar, { height: 6 + Math.random() * 15 }]} />
              <View style={[styles.waveBar, { height: 10 + Math.random() * 10 }]} />
              <View style={[styles.waveBar, { height: 16 + Math.random() * 8 }]} />
              <View style={[styles.waveBar, { height: 8 + Math.random() * 12 }]} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.profileSummaryCard}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' }}>
            🎙️ Waiting for device ambient audio upload...
          </Text>
        </View>
      )}

      {/* Coordinate Logs History Timeline */}
      <View style={styles.devicesSection}>
        <Text style={[styles.sectionHeading, { marginBottom: 12 }]}>Safety History Timeline</Text>
        {trackerLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTextIcon}>🛰️</Text>
            <Text style={styles.emptyText}>Waiting for device signals to log...</Text>
          </View>
        ) : (
          trackerLogs.map((log, index) => {
            const logTime = new Date(log.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return (
              <View key={log.id || index} style={styles.deviceListItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, marginRight: 12 }}>🗺️</Text>
                  <View>
                    <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }}>
                      {parseFloat(log.latitude).toFixed(5)}, {parseFloat(log.longitude).toFixed(5)}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                      Accuracy: {log.accuracy ? parseFloat(log.accuracy).toFixed(1) : 'N/A'} meters
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.accentCyan, fontSize: 12, fontWeight: '700' }}>
                  {logTime}
                </Text>
              </View>
            );
          })
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
  bannerStatic: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  bannerStaticText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
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
  audioPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentCyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    fontSize: 18,
    marginLeft: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.borderDark,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accentCyan,
  },
  waveContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 32,
    marginTop: 12,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#818CF8',
    marginHorizontal: 3,
    borderRadius: 2,
  },
  devicesSection: {
    marginTop: 16,
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
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
  deviceListItem: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
});
