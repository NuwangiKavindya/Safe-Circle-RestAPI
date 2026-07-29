import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BoundDevice } from '../types';
import { COLORS } from '../styles/theme';

interface DeviceCardProps {
  device: BoundDevice;
  onUnbind: (deviceId: string) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onUnbind }) => {
  return (
    <View style={styles.container}>
      <View style={styles.rowMain}>
        <Text style={styles.icon}>📱</Text>
        <View style={styles.metaContainer}>
          <Text style={styles.deviceName}>{device.deviceName}</Text>
          <Text style={styles.deviceDetail}>
            {device.deviceModel} ({device.deviceOs})
          </Text>
          <Text style={styles.imeiText}>IMEI: {device.imeiNumber}</Text>
        </View>
      </View>
      <View style={styles.actionColumn}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>Linked</Text>
        </View>
        <TouchableOpacity style={styles.unlinkBtn} onPress={() => onUnbind(device.id)}>
          <Text style={styles.unlinkBtnText}>Unlink</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 26,
    marginRight: 16,
  },
  metaContainer: {
    flex: 1,
  },
  deviceName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  deviceDetail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  imeiText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  actionColumn: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: COLORS.accentGreenBg,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  unlinkBtn: {
    marginTop: 8,
  },
  unlinkBtnText: {
    color: COLORS.accentRed,
    fontSize: 12,
    fontWeight: '600',
  },
});
