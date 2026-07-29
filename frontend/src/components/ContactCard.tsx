import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TrustedContact } from '../types';
import { COLORS } from '../styles/theme';

interface ContactCardProps {
  contact: TrustedContact;
  onDelete: (contactId: string) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onDelete }) => {
  return (
    <View style={styles.container}>
      <View style={styles.rowMain}>
        <Text style={styles.icon}>👤</Text>
        <View style={styles.metaContainer}>
          <Text style={styles.contactName}>{contact.contactName}</Text>
          <Text style={styles.contactDetail}>
            {contact.relationship} • {contact.contactPhone}
          </Text>
          {contact.contactEmail ? (
            <Text style={styles.contactDetail}>{contact.contactEmail}</Text>
          ) : null}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabelText}>Secure Access Code:</Text>
            <Text style={styles.codeText}>{contact.accessCode}</Text>
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
  contactName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  contactDetail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  codeContainer: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
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
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.indigoBg,
    alignSelf: 'center',
  },
  removeBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
});
