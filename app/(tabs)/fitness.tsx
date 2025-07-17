import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { storage, storageHelpers } from '../../storage/mmkv';

// Define your types
interface ProgressPhoto {
  id: string;
  uri: string;
  date: string;
  type: 'front' | 'side' | 'back';
}

interface UserStats {
  weight: number;
  height: number;
  age: number;
  goal: string;
}

export default function Fitness() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    weight: 0,
    height: 0,
    age: 0,
    goal: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load progress photos from AsyncStorage
  const loadProgressPhotos = async () => {
    try {
      const photos = await storageHelpers.getObjectWithDefaultAsync<ProgressPhoto[]>('progressPhotos', []);
      setProgressPhotos(photos);
      console.log('Loaded progress photos:', photos.length);
    } catch (error) {
      console.error('Error loading progress photos:', error);
    }
  };

  // Load user stats from AsyncStorage
  const loadUserStats = async () => {
    try {
      const stats = await storageHelpers.getObjectWithDefaultAsync<UserStats>('userStats', {
        weight: 0,
        height: 0,
        age: 0,
        goal: '',
      });
      setUserStats(stats);
      console.log('Loaded user stats:', stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  // Save progress photos to AsyncStorage
  const saveProgressPhotos = async (photos: ProgressPhoto[]) => {
    try {
      storageHelpers.setObject('progressPhotos', photos);
      setProgressPhotos(photos);
    } catch (error) {
      console.error('Error saving progress photos:', error);
    }
  };

  // Save user stats to AsyncStorage
  const saveUserStats = async (stats: UserStats) => {
    try {
      storageHelpers.setObject('userStats', stats);
      setUserStats(stats);
    } catch (error) {
      console.error('Error saving user stats:', error);
    }
  };

  // Test function to add sample data
  const addSampleData = async () => {
    const samplePhoto: ProgressPhoto = {
      id: Date.now().toString(),
      uri: 'sample-uri-' + Date.now(),
      date: new Date().toISOString(),
      type: 'front'
    };
    
    const updatedPhotos = [...progressPhotos, samplePhoto];
    await saveProgressPhotos(updatedPhotos);
    
    Alert.alert('Success', 'Sample photo added!');
  };

  // Test function to update user stats
  const updateSampleStats = async () => {
    const newStats: UserStats = {
      weight: Math.floor(Math.random() * 30) + 60, // Random weight between 60-90
      height: Math.floor(Math.random() * 30) + 160, // Random height between 160-190
      age: Math.floor(Math.random() * 20) + 20, // Random age between 20-40
      goal: 'Build muscle and stay healthy'
    };
    
    await saveUserStats(newStats);
    Alert.alert('Success', 'User stats updated!');
  };

  // Handle navigation back
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadProgressPhotos(), loadUserStats()]);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  // Render your component
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fitness Tracker</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Photos</Text>
        <Text style={styles.info}>Total Photos: {progressPhotos.length}</Text>
        {progressPhotos.map((photo, index) => (
          <Text key={photo.id} style={styles.photoItem}>
            {index + 1}. {photo.type} - {new Date(photo.date).toLocaleDateString()}
          </Text>
        ))}
        <TouchableOpacity onPress={addSampleData} style={styles.button}>
          <Text style={styles.buttonText}>Add Sample Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Stats</Text>
        <Text style={styles.info}>Weight: {userStats.weight}kg</Text>
        <Text style={styles.info}>Height: {userStats.height}cm</Text>
        <Text style={styles.info}>Age: {userStats.age}</Text>
        <Text style={styles.info}>Goal: {userStats.goal}</Text>
        <TouchableOpacity onPress={updateSampleStats} style={styles.button}>
          <Text style={styles.buttonText}>Update Sample Stats</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Camera</Text>
        <Text style={styles.info}>Camera Permission: {hasPermission ? 'Granted' : 'Not granted'}</Text>
        <TouchableOpacity 
          onPress={() => setShowCamera(!showCamera)} 
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {showCamera ? 'Hide Camera' : 'Show Camera'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  photoItem: {
    fontSize: 14,
    marginBottom: 3,
    color: '#888',
    paddingLeft: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});