import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, StyleProp } from 'react-native';

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<any>;
}

export default function Avatar({ url, name, size = 40, style }: AvatarProps) {
  const initials = (name || 'U')
    .split(' ')
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.container, containerStyle, style]}
      />
    );
  }

  return (
    <View style={[styles.container, styles.fallback, containerStyle, style]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
