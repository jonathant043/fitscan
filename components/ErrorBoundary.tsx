// components/ErrorBoundary.tsx
// React Error Boundary to catch and handle rendering errors

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (in production, send to error tracking service like Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <Ionicons name="warning" size={64} color={COLORS.error} />

          <Text style={styles.title}>Something went wrong</Text>

          <Text style={styles.message}>
            We encountered an unexpected error. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontFamily: 'monospace',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});
