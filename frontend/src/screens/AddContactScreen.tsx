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
import { ContactFormState } from '../types';
import { globalStyles, COLORS } from '../styles/theme';

interface AddContactScreenProps {
  contactForm: ContactFormState;
  setContactForm: React.Dispatch<React.SetStateAction<ContactFormState>>;
  loading: boolean;
  onAddContact: () => void;
  onNavigateDashboard: () => void;
}

export const AddContactScreen: React.FC<AddContactScreenProps> = ({
  contactForm,
  setContactForm,
  loading,
  onAddContact,
  onNavigateDashboard,
}) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContent}>
      <View style={globalStyles.subHeader}>
        <TouchableOpacity onPress={onNavigateDashboard} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={globalStyles.subTitle}>Add Contact</Text>
      </View>

      <View style={globalStyles.formCard}>
        <Text style={styles.formInstructions}>
          Add a contact to your safety circle. The system will automatically generate a secure access code for them.
        </Text>

        <Text style={globalStyles.inputLabel}>Full Name</Text>
        <TextInput
          placeholder="e.g. Jane Doe"
          placeholderTextColor={COLORS.textMuted}
          style={globalStyles.input}
          value={contactForm.contactName}
          onChangeText={text => setContactForm(prev => ({ ...prev, contactName: text }))}
        />

        <Text style={globalStyles.inputLabel}>Phone Number</Text>
        <TextInput
          placeholder="e.g. +19999999999"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          style={globalStyles.input}
          value={contactForm.contactPhone}
          onChangeText={text => setContactForm(prev => ({ ...prev, contactPhone: text }))}
        />

        <Text style={globalStyles.inputLabel}>Email Address (Optional)</Text>
        <TextInput
          placeholder="e.g. jane@example.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={globalStyles.input}
          value={contactForm.contactEmail}
          onChangeText={text => setContactForm(prev => ({ ...prev, contactEmail: text }))}
        />

        <Text style={globalStyles.inputLabel}>Relationship</Text>
        <View style={globalStyles.tabContainer}>
          {['Friend', 'Family', 'Partner', 'Other'].map(rel => (
            <TouchableOpacity
              key={rel}
              style={[
                globalStyles.tabButton,
                contactForm.relationship === rel && globalStyles.tabButtonActive,
                { flex: 1, marginHorizontal: 2 },
              ]}
              onPress={() => setContactForm(prev => ({ ...prev, relationship: rel }))}
            >
              <Text
                style={[
                  globalStyles.tabButtonText,
                  contactForm.relationship === rel && globalStyles.tabButtonTextActive,
                  { fontSize: 11 },
                ]}
              >
                {rel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            globalStyles.primaryButton,
            loading && globalStyles.disabledButton,
            { marginTop: 24 },
          ]}
          onPress={onAddContact}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Add to Safety Circle</Text>
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
});
