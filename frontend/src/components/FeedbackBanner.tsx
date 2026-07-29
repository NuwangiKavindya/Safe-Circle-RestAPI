import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles } from '../styles/theme';

interface FeedbackBannerProps {
  errorMessage: string | null;
  successMessage: string | null;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ errorMessage, successMessage }) => {
  if (errorMessage) {
    return (
      <View style={[globalStyles.banner, globalStyles.bannerError]}>
        <Text style={globalStyles.bannerText}>⚠️ {errorMessage}</Text>
      </View>
    );
  }

  if (successMessage) {
    return (
      <View style={[globalStyles.banner, globalStyles.bannerSuccess]}>
        <Text style={globalStyles.bannerText}>✅ {successMessage}</Text>
      </View>
    );
  }

  return null;
};
