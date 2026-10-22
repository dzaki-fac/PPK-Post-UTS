import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = '📋',
  title,
  message,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionText && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
          onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#EA580C',
    borderRadius: 8,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
