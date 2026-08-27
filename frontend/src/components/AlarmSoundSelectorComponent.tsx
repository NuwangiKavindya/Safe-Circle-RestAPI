import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { soundService, SOUND_PRESETS, SoundPreset } from '../services/soundService';
import { apiService } from '../services/api';
import { COLORS } from '../styles/theme';

interface AlarmSoundSelectorComponentProps {
  userToken?: string | null;
  onShowToast?: (message: string, isError?: boolean) => void;
}

export const AlarmSoundSelectorComponent: React.FC<AlarmSoundSelectorComponentProps> = ({
  userToken,
  onShowToast,
}) => {
  const [selectedSoundId, setSelectedSoundId] = useState<string>('police_siren');
  const [previewingSoundId, setPreviewingSoundId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    // Load saved sound preference on mount
    soundService.getSelectedSound().then(id => {
      setSelectedSoundId(id);
    });

    return () => {
      soundService.stopSound();
    };
  }, []);

  const handleTogglePreview = (soundId: string) => {
    if (previewingSoundId === soundId) {
      soundService.stopSound();
      setPreviewingSoundId(null);
    } else {
      soundService.playSound(soundId);
      setPreviewingSoundId(soundId);
    }
  };

  const handleSelectSound = (soundId: string) => {
    setSelectedSoundId(soundId);
  };

  const handleSavePreference = async () => {
    soundService.stopSound();
    setPreviewingSoundId(null);
    setIsSaving(true);

    try {
      // 1. Save to local AsyncStorage
      await soundService.setSelectedSound(selectedSoundId);

      // 2. Save to backend user profile if token exists
      if (userToken) {
        await apiService.updateAlarmSoundPreference(userToken, selectedSoundId);
      }

      if (onShowToast) {
        const preset = SOUND_PRESETS.find(s => s.id === selectedSoundId);
        onShowToast(`✅ Alarm siren set to "${preset?.name || selectedSoundId}"`, false);
      }
    } catch (e) {
      console.error('[AlarmSoundSelector] Error saving sound preference:', e);
      if (onShowToast) {
        onShowToast('Failed to save alarm sound preference.', true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPreset = SOUND_PRESETS.find(s => s.id === selectedSoundId) || SOUND_PRESETS[0];

  return (
    <View style={styles.cardContainer}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerIcon}>🔊</Text>
          <View>
            <Text style={styles.cardTitle}>Anti-Theft Siren Selector</Text>
            <Text style={styles.cardSubtitle}>
              Active: {selectedPreset.icon} {selectedPreset.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Preset List */}
      <View style={styles.presetListContainer}>
        {SOUND_PRESETS.map((preset: SoundPreset) => {
          const isSelected = selectedSoundId === preset.id;
          const isPreviewing = previewingSoundId === preset.id;

          return (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetItemCard,
                isSelected && styles.presetItemCardSelected,
              ]}
              onPress={() => handleSelectSound(preset.id)}
              activeOpacity={0.8}
            >
              {/* Left Radio Indicator */}
              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                {isSelected && <View style={styles.radioInnerDot} />}
              </View>

              {/* Sound Details */}
              <View style={styles.presetContent}>
                <View style={styles.presetTitleRow}>
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text style={[styles.presetName, isSelected && styles.presetNameSelected]}>
                    {preset.name}
                  </Text>
                </View>
                <Text style={styles.presetDesc}>{preset.description}</Text>
              </View>

              {/* Preview Button */}
              <TouchableOpacity
                style={[
                  styles.previewBtn,
                  isPreviewing && styles.previewBtnActive,
                ]}
                onPress={() => handleTogglePreview(preset.id)}
              >
                <Text style={styles.previewBtnText}>
                  {isPreviewing ? '⏹️ Stop' : '▶️ Listen'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSavePreference}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>💾 Save Sound Preference</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  cardHeader: {
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: COLORS.accentCyan,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  presetListContainer: {
    gap: 8,
  },
  presetItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderDark,
  },
  presetItemCardSelected: {
    borderColor: COLORS.accentCyan,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: COLORS.accentCyan,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accentCyan,
  },
  presetContent: {
    flex: 1,
  },
  presetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  presetName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  presetNameSelected: {
    color: COLORS.accentCyan,
  },
  presetDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  previewBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  previewBtnActive: {
    backgroundColor: COLORS.accentRedBg,
    borderColor: COLORS.accentRed,
  },
  previewBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.accentGreenBg,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.accentGreen,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
