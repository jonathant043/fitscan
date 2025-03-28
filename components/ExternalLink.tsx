import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const ExternalLink = ({ url, children }) => {
  const openLink = async () => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <Pressable onPress={openLink} style={styles.link}>
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  link: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  text: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
});

export default ExternalLink;
