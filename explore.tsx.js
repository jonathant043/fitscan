import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';

const CommunityFeedScreen = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [name] = useMMKVString('user.name', storage) || 'User';
  const [age] = useMMKVString('user.age', storage);
  const isOlder = parseInt(age) > 60;

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const shadowColor = useThemeColor({}, 'shadow');

  useEffect(() => {
    const storedPosts = storage.getString('community.posts');
    if (storedPosts) {
      setPosts(JSON.parse(storedPosts));
    } else {
      const initialPosts = [
        { id: '1', user: 'John Doe', content: 'Just finished a great workout!', timestamp: new Date().toISOString() },
        { id: '2', user: 'Jane Smith', content: 'Anyone know a good place to hike?', timestamp: new Date().toISOString() },
      ];
      setPosts(initialPosts);
      storage.set('community.posts', JSON.stringify(initialPosts));
    }
  }, []);

  const addPost = () => {
    if (!newPost.trim()) return;
    const post = {
      id: Date.now().toString(), // Simple unique ID
      user: name,
      content: newPost,
      timestamp: new Date().toISOString(),
    };
    const updatedPosts = [post, ...posts];
    setPosts(updatedPosts);
    storage.set('community.posts', JSON.stringify(updatedPosts));
    setNewPost('');
  };

  const renderItem = useCallback(({ item }) => (
    <View style={[styles.post, { backgroundColor, shadowColor }]}>
      <Text style={[styles.postUser, isOlder && styles.largerText, { color: primaryColor }]}>
        {item.user}
      </Text>
      <Text style={[styles.postContent, isOlder && styles.largerText, { color: textColor }]}>
        {item.content}
      </Text>
      <Text style={[styles.postTimestamp, isOlder && styles.largerText, { color: textColor }]}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  ), [backgroundColor, textColor, primaryColor, shadowColor, isOlder]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Community Feed
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, isOlder && styles.largerInput, { borderColor: textColor, color: textColor }]}
          placeholder="Share something..."
          placeholderTextColor={textColor}
          value={newPost}
          onChangeText={setNewPost}
          onSubmitEditing={addPost}
        />
        <TouchableOpacity
          style={[styles.postButton, { backgroundColor: primaryColor }]}
          onPress={addPost}
        >
          <Text style={[styles.postButtonText, isOlder && styles.largerText, { color: '#fff' }]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  postButton: {
    padding: 10,
    borderRadius: 8,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  post: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  postUser: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  postContent: {
    fontSize: 14,
    marginTop: 4,
  },
  postTimestamp: {
    fontSize: 12,
    marginTop: 6,
  },
  largerText: {
    fontSize: 20,
  },
  largerInput: {
    height: 48,
    fontSize: 18,
  },
});

export default CommunityFeedScreen;