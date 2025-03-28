import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, TextInput } from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';

const EquipmentScanScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const cameraRef = useRef(null);
  const [age] = useMMKVString('user.age', storage);
  const isOlder = parseInt(age) > 60;

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    const equipment = recognizeEquipment(data);
    setSelectedEquipment(equipment);
    showEquipmentAlert(equipment);
  };

  const recognizeEquipment = (barcodeData) => {
    const equipmentDatabase = {
      "123456": "Dumbbells",
      "789012": "Treadmill",
      "345678": "Rowing Machine",
      "901234": "Kettlebell",
    };
    return equipmentDatabase[barcodeData] || "Unknown Equipment";
    // TODO: Replace with API call, e.g., fetch(`${SCAN_API_URL}?code=${barcodeData}`)
  };

  const showEquipmentAlert = (equipment) => {
    Alert.alert(
      "Equipment Scanned",
      `Detected: ${equipment}`,
      [
        { text: "Scan Again", onPress: () => setScanned(false) },
        { text: "Use This", onPress: () => navigation.navigate('workout', { equipment }) },
      ]
    );
  };

  const manualEquipmentList = ['Dumbbells', 'Treadmill', 'Yoga Mat', 'Resistance Band'];

  const confirmManualEquipment = () => {
    if (manualInput) {
      setSelectedEquipment(manualInput);
      navigation.navigate('workout', { equipment: manualInput });
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor }]}>
        <Text style={[styles.permissionText, isOlder && styles.largerText, { color: textColor }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor }]}>
        <Text style={[styles.permissionText, isOlder && styles.largerText, { color: textColor }]}>
          No access to camera.
        </Text>
        <Text style={[styles.permissionText, isOlder && styles.largerText, { color: textColor }]}>
          Please enable camera permissions in settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.back}
        barCodeScannerSettings={{ barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr, BarCodeScanner.Constants.BarCodeType.ean13] }}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <Text style={[styles.scanText, isOlder && styles.largerText, { color: '#fff' }]}>
            Align the QR/Barcode within the frame
          </Text>
        </View>
      </Camera>

      {scanned && (
        <View style={styles.postScanContainer}>
          <Text style={[styles.resultText, isOlder && styles.largerText, { color: textColor }]}>
            Detected: {selectedEquipment}
          </Text>
          <TouchableOpacity
            style={[styles.scanAgainButton, { backgroundColor: primaryColor }]}
            onPress={() => setScanned(false)}
          >
            <Text style={[styles.scanAgainText, isOlder && styles.largerText, { color: '#fff' }]}>
              Scan Again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.manualContainer}>
        <Text style={[styles.manualLabel, isOlder && styles.largerText, { color: textColor }]}>
          Or select manually:
        </Text>
        <FlatList
          data={manualEquipmentList}
          horizontal
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.manualButton, { backgroundColor: primaryColor }]}
              onPress={() => navigation.navigate('workout', { equipment: item })}
            >
              <Text style={[styles.manualText, isOlder && styles.largerText, { color: '#fff' }]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
        <TextInput
          style={[styles.manualInput, isOlder && styles.largerInput, { borderColor: textColor, color: textColor }]}
          placeholder="Type equipment name"
          placeholderTextColor={textColor}
          value={manualInput}
          onChangeText={setManualInput}
          onSubmitEditing={confirmManualEquipment}
        />
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: primaryColor }]}
          onPress={confirmManualEquipment}
        >
          <Text style={[styles.confirmText, isOlder && styles.largerText, { color: '#fff' }]}>
            Confirm
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  permissionText: {
    fontSize: 16,
  },
  camera: {
    flex: 0.7,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingBottom: 20,
  },
  scanText: {
    fontSize: 16,
  },
  postScanContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    marginBottom: 10,
  },
  scanAgainButton: {
    padding: 10,
    borderRadius: 8,
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualContainer: {
    padding: 20,
    alignItems: 'center',
  },
  manualLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  manualButton: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  manualText: {
    fontSize: 16,
  },
  manualInput: {
    height: 40,
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  confirmButton: {
    padding: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  largerText: {
    fontSize: 20,
  },
  largerInput: {
    height: 48,
    fontSize: 18,
  },
});

export default EquipmentScanScreen;