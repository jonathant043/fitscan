import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useMMKVString, useMMKVNumber } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';

const LeaderboardsScreen = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name] = useMMKVString('user.name', storage) || 'User';
  const [age] = useMMKVString('user.age', storage);
  const [userPoints] = useMMKVNumber('user.points', storage) || 0;
  const isOlder = parseInt(age) > 60;

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const shadowColor = useThemeColor({}, 'shadow');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const storedLeaderboard = storage.getString('leaderboard.data');
      let data = storedLeaderboard ? JSON.parse(storedLeaderboard) : [];

      if (!data.length) {
        data = [
          { id: '1', rank: 1, user: 'John Doe', points: 1200 },
          { id: '2', rank: 2, user: 'Jane Smith', points: 1100 },
          { id: '3', rank: 3, user: 'Alex Johnson', points: 950 },
        ];
      }

      // Add current user if not in top ranks
      const userEntry = data.find((entry) => entry.user === name);
      if (!userEntry && userPoints > 0) {
        data.push({ id: Date.now().toString(), rank: data.length + 1, user: name, points: userPoints });
      }

      // Sort by points and reassign ranks
      data.sort((a, b) => b.points - a.points);
      data.forEach((item, index) => (item.rank = index + 1));

      setLeaderboardData(data);
      storage.set('leaderboard.data', JSON.stringify(data));
      setLoading(false);
    };

    fetchLeaderboard();
  }, [name, userPoints]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Leaderboards
      </Text>

      {loading ? (
        <ActivityIndicator size={isOlder ? 'large' : 'small'} color={primaryColor} />
      ) : leaderboardData.length > 0 ? (
        <>
          <Text style={[styles.userScore, isOlder && styles.largerText, { color: textColor }]}>
            Your Score: {userPoints} pts (Rank: {leaderboardData.find((item) => item.user === name)?.rank || 'N/A'})
          </Text>
          <FlatList
            data={leaderboardData}
            renderItem={({ item }) => (
              <View style={[styles.leaderboardItem, { backgroundColor, shadowColor }]}>
                <Text style={[styles.rank, isOlder && styles.largerText, { color: primaryColor }]}>
                  {item.rank}.
                </Text>
                <Text style={[styles.username, isOlder && styles.largerText, { color: textColor }]}>
                  {item.user}
                </Text>
                <Text style={[styles.points, isOlder && styles.largerText, { color: textColor }]}>
                  {item.points} pts
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        </>
      ) : (
        <Text style={[styles.noDataText, isOlder && styles.largerText, { color: textColor }]}>
          No leaderboard data available.
        </Text>
      )}
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
    textAlign: 'center',
    marginBottom: 16,
  },
  userScore: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 30,
  },
  username: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  largerText: {
    fontSize: 20,
  },
});

export default LeaderboardsScreen;