import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { TrustedContact } from '../types';
import { COLORS } from '../styles/theme';

interface ContactCardProps {
  contact: TrustedContact;
  onDelete: (contactId: string) => void;
  onToggleSharingMode?: (contactId: string, currentMode: 'EMERGENCY_ONLY' | 'ALWAYS_ON') => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onDelete,
  onToggleSharingMode,
}) => {
  const currentMode = contact.sharingMode || 'EMERGENCY_ONLY';

  const handleShareInvitation = async () => {
    try {
      const message = `🚨 SafeCircle Security Network Invitation 🚨\n\nI have added you (${contact.contactName}) as a trusted safety contact on SafeCircle.\n\nIn an emergency, or to track my location, open SafeCircle Emergency Portal and enter Access Code: ${contact.accessCode}`;
      await Share.share({
        title: 'SafeCircle Security Network Access',
        message,
      });
    } catch (e: any) {
      Alert.alert('Share Error', e.message || 'Could not launch sharing sheet.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.rowMain}>
        <Text style={styles.icon}>👤</Text>
        <View style={styles.metaContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.contactName}>{contact.contactName}</Text>
            <TouchableOpacity
              style={[
                styles.modeBadge,
                currentMode === 'ALWAYS_ON' ? styles.modeAlwaysOn : styles.modeEmergency,
              ]}
              onPress={() => onToggleSharingMode && onToggleSharingMode(contact.id, currentMode)}
            >
              <Text style={styles.modeBadgeText}>
                {currentMode === 'ALWAYS_ON' ? '🌐 Always-On' : '🔒 Emergency Only'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.contactDetail}>
            {contact.relationship} • {contact.contactPhone}
          </Text>
          {contact.contactEmail ? (
            <Text style={styles.contactDetail}>{contact.contactEmail}</Text>
          ) : null}

          <View style={styles.codeContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.codeLabelText}>Access Code:</Text>
              <Text style={styles.codeText}>{contact.accessCode}</Text>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShareInvitation}>
              <Text style={styles.shareBtnText}>📲 Share Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.removeBtn} onPress={() => onDelete(contact.id)}>
        <Text style={styles.removeBtnText}>Remove</Text>
      </TouchableOpacity>
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
    alignItems: 'flex-start',
    flex: 1,
  },
  icon: {
    fontSize: 26,
    marginRight: 12,
    marginTop: 2,
  },
  metaContainer: {
    flex: 1,
    marginRight: 12,
  },
  contactName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  modeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  modeEmergency: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: '#3B82F6',
  },
  modeAlwaysOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  modeBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  contactDetail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  codeContainer: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  codeLabelText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginRight: 6,
  },
  codeText: {
    color: COLORS.accentCyan,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  shareBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  shareBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accentRedBg,
    alignSelf: 'center',
  },
  removeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
