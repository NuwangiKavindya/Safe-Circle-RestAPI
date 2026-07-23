import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService, API_BASE_URL, TrustedContact, Alert as ApiAlert } from './src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

type ScreenType = 'WELCOME' | 'SIGNUP' | 'DASHBOARD' | 'BIND_DEVICE' | 'ADD_CONTACT' | 'TRACKER_AUTH' | 'TRACKER_DASHBOARD' | 'GOOGLE_PHONE_REGISTER';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
}

interface BoundDevice {
  id: string;
  deviceName: string;
  deviceModel: string;
  imeiNumber: string;
  deviceOs: string;
  createdAt: string;
}

const App = () => {
  // Navigation & Session State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('WELCOME');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [devices, setDevices] = useState<BoundDevice[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [activeAlert, setActiveAlert] = useState<ApiAlert | null>(null);

  // Local Contact Form State
  const [contactForm, setContactForm] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    relationship: 'Friend',
  });

  // Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local Signup Form State
  const [signUpForm, setSignUpForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  // Local Signin Form State
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  // Password Visibility Toggle States
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  // Device Binding Form State
  const [deviceForm, setDeviceForm] = useState({
    deviceName: '',
    deviceModel: '',
    imeiNumber: '',
    deviceOs: Platform.OS === 'ios' ? 'iOS' : 'Android',
  });

  // Tracker Access Portal State
  const [trackerCode, setTrackerCode] = useState('');
  const [trackerInfo, setTrackerInfo] = useState<any>(null);
  const [trackerLogs, setTrackerLogs] = useState<any[]>([]);
  const [trackerAudioPlaying, setTrackerAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const socketRef = useRef<any>(null);

  // UI Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentScreen === 'DASHBOARD') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentScreen, pulseAnim]);

  // Fade-in animation for active screen transitions
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [currentScreen, fadeAnim]);

  // Google Phone Registration Form State
  const [googlePhoneInput, setGooglePhoneInput] = useState('');

  // Load session from AsyncStorage on startup and configure Google Sign-In
  useEffect(() => {
    const loadSession = async () => {
      try {
        const cachedToken = await AsyncStorage.getItem('@safecircle_token');
        const cachedUser = await AsyncStorage.getItem('@safecircle_user');
        if (cachedToken && cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          setToken(cachedToken);
          setUser(parsedUser);
          if (!parsedUser.phoneNumber || parsedUser.phoneNumber.trim() === '') {
            setCurrentScreen('GOOGLE_PHONE_REGISTER');
          } else {
            setCurrentScreen('DASHBOARD');
          }
        }
      } catch (err) {
        console.log('Error reading cached session:', err);
      }
    };
    loadSession();

    // Configure Google Sign-In SDK
    GoogleSignin.configure({
      webClientId: '342423658982-ehokj2fvf0itu21b2t7hs04ucmjcu6nt.apps.googleusercontent.com',
      iosClientId: '342423658982-3sj5f5oiuv6hqduk15mtv69jtet1li4v.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  // Helper: Display floating error or success banner
  const triggerFeedback = (message: string, isError: boolean = true) => {
    if (isError) {
      setErrorMessage(message);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(message);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setErrorMessage(null);
      setSuccessMessage(null);
    }, 4000);
  };

  // Auth: Local User Registration
  const handleLocalRegister = async () => {
    const { fullName, email, phoneNumber, password, confirmPassword } = signUpForm;

    if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
      triggerFeedback('Please fill in all registration fields.');
      return;
    }

    if (password !== confirmPassword) {
      triggerFeedback('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await apiService.register({
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
    });
    setLoading(false);

    if (result.success && result.token && result.data) {
      try {
        await AsyncStorage.setItem('@safecircle_token', result.token);
        await AsyncStorage.setItem('@safecircle_user', JSON.stringify(result.data));
      } catch (e) {
        console.log('Session cache error:', e);
      }
      setToken(result.token);
      setUser(result.data);
      setDevices([]); // fresh account starts with no devices
      setCurrentScreen('DASHBOARD');
      // Reset form
      setSignUpForm({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
      });
      triggerFeedback('Account created successfully!', false);
    } else {
      triggerFeedback(result.message || 'Registration failed');
    }
  };

  // Auth: Local User Login
  const handleLocalLogin = async () => {
    const { email, password } = signInForm;

    if (!email || !password) {
      triggerFeedback('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const result = await apiService.login({ email, password });
    setLoading(false);

    if (result.success && result.token && result.data) {
      try {
        await AsyncStorage.setItem('@safecircle_token', result.token);
        await AsyncStorage.setItem('@safecircle_user', JSON.stringify(result.data));
      } catch (e) {
        console.log('Session cache error:', e);
      }
      setToken(result.token);
      setUser(result.data);
      setDevices([]); // fresh load (we will query devices if needed, currently list is kept local)
      setCurrentScreen('DASHBOARD');
      // Reset form
      setSignInForm({ email: '', password: '' });
      triggerFeedback('Logged in successfully!', false);
    } else {
      triggerFeedback(result.message || 'Invalid email or password.');
    }
  };

  // Auth: Native Google Sign-In Handler
  const handleNativeGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Force clearing cached active session so native OS account picker always appears to select from all device accounts
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore error if not previously signed in
      }
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;

      if (!idToken) {
        throw new Error('Google Sign-In did not return an ID token.');
      }

      const result = await apiService.googleLogin({ idToken });
      setLoading(false);

      if (result.success && result.token && result.data) {
        try {
          await AsyncStorage.setItem('@safecircle_token', result.token);
          await AsyncStorage.setItem('@safecircle_user', JSON.stringify(result.data));
        } catch (e) {
          console.log('Session cache error:', e);
        }
        setToken(result.token);
        setUser(result.data);
        setDevices([]);
        if (result.requiresPhoneNumber || !result.data.phoneNumber || result.data.phoneNumber.trim() === '') {
          setCurrentScreen('GOOGLE_PHONE_REGISTER');
          triggerFeedback('Please register your mobile phone number to complete signup.', false);
        } else {
          setCurrentScreen('DASHBOARD');
          triggerFeedback('Google Login Successful!', false);
        }
      } else {
        triggerFeedback(result.message || 'Google SSO verification failed.');
      }
    } catch (error: any) {
      setLoading(false);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled Google Sign-In flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Google Sign-In is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        triggerFeedback('Google Play Services are missing or out of date on this device.');
      } else {
        console.log('Native Google Sign-in Error:', error);
        triggerFeedback(error.message || 'Google Sign-In failed.');
      }
    }
  };

  // Auth: Submit Phone Number for Google SSO First-Time Users
  const handleUpdateGooglePhone = async () => {
    if (!googlePhoneInput.trim()) {
      triggerFeedback('Please enter a valid mobile phone number.');
      return;
    }

    if (!token) {
      triggerFeedback('Session expired. Please log in again.');
      setCurrentScreen('WELCOME');
      return;
    }

    try {
      setLoading(true);
      const res = await apiService.updatePhoneNumber(googlePhoneInput.trim(), token);
      setLoading(false);

      if (res.success && res.data) {
        setUser(res.data);
        try {
          await AsyncStorage.setItem('@safecircle_user', JSON.stringify(res.data));
        } catch (e) {
          console.log('Session update error:', e);
        }
        setGooglePhoneInput('');
        triggerFeedback('Phone number registered successfully!', false);
        setCurrentScreen('DASHBOARD');
      } else {
        triggerFeedback(res.message || 'Failed to update phone number.');
      }
    } catch (err: any) {
      setLoading(false);
      triggerFeedback(err.message || 'An error occurred while updating phone number.');
    }
  };

  // Device: Bind Device
  const handleBindDevice = async () => {
    const { deviceName, deviceModel, imeiNumber, deviceOs } = deviceForm;

    if (!deviceName || !deviceModel || !imeiNumber || !deviceOs) {
      triggerFeedback('All device configuration fields are required.');
      return;
    }

    if (!token) {
      triggerFeedback('Auth session expired. Please log in again.');
      setCurrentScreen('WELCOME');
      return;
    }

    setLoading(true);
    const result = await apiService.bindDevice(token, {
      deviceName,
      deviceModel,
      imeiNumber,
      deviceOs,
    });
    setLoading(false);

    if (result.success && result.data) {
      const newDevice: BoundDevice = {
        id: result.data.id,
        deviceName: result.data.deviceName,
        deviceModel: result.data.deviceModel,
        imeiNumber: result.data.imeiNumber,
        deviceOs: result.data.deviceOs,
        createdAt: result.data.createdAt,
      };

      setDevices(prev => [newDevice, ...prev]);
      setCurrentScreen('DASHBOARD');
      // Reset device form
      setDeviceForm({
        deviceName: '',
        deviceModel: '',
        imeiNumber: '',
        deviceOs: Platform.OS === 'ios' ? 'iOS' : 'Android',
      });
      triggerFeedback('Device linked successfully!', false);
    } else {
      triggerFeedback(result.message || 'Failed to bind device.');
    }
  };

  // Auto-fill values in Device Binder for quick onboarding testing
  const autoDetectDeviceDetails = () => {
    setDeviceForm({
      deviceName: `${Platform.OS === 'ios' ? 'My Simulator' : 'Android Virtual Device'}`,
      deviceModel: Platform.OS === 'ios' ? 'iPhone 15 Pro' : 'Pixel 8 Pro',
      imeiNumber: Math.floor(100000000000000 + Math.random() * 900000000000000).toString(), // random valid-length IMEI
      deviceOs: Platform.OS === 'ios' ? 'iOS' : 'Android',
    });
  };

  // Fetch contacts on session start
  const fetchContacts = async (sessionToken: string) => {
    setLoading(true);
    const result = await apiService.getContacts(sessionToken);
    setLoading(false);
    if (result.success && result.data) {
      setContacts(result.data);
    } else {
      triggerFeedback(result.message || 'Failed to load safety contacts.');
    }
  };

  // Fetch devices on session start
  const fetchDevices = async (sessionToken: string) => {
    setLoading(true);
    const result = await apiService.getDevices(sessionToken);
    setLoading(false);
    if (result.success && result.data) {
      // Map API data to local BoundDevice shape
      const mappedDevices = result.data.map((d: any) => ({
        id: d.id,
        deviceName: d.deviceName,
        deviceModel: d.deviceModel,
        imeiNumber: d.imeiNumber,
        deviceOs: d.deviceOs,
        createdAt: d.createdAt,
      }));
      setDevices(mappedDevices);
    } else {
      triggerFeedback(result.message || 'Failed to load registered devices.');
    }
  };

  // Unbind a device
  const handleUnbindDevice = async (deviceId: string) => {
    if (!token) return;

    Alert.alert(
      'Remove Device',
      'Are you sure you want to unbind this device from your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unbind',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await apiService.unbindDevice(token, deviceId);
            setLoading(false);
            if (result.success) {
              setDevices(prev => prev.filter(d => d.id !== deviceId));
              triggerFeedback('Device unbound successfully.', false);
            } else {
              triggerFeedback(result.message || 'Failed to unbind device.');
            }
          },
        },
      ]
    );
  };

  // Fetch active alerts on session start
  const fetchActiveAlerts = async (sessionToken: string) => {
    const result = await apiService.getActiveAlerts(sessionToken);
    if (result.success && result.data && result.data.length > 0) {
      setActiveAlert(result.data[0]);
    } else {
      setActiveAlert(null);
    }
  };

  // Fetch contacts and devices when token changes
  useEffect(() => {
    if (token) {
      fetchContacts(token);
      fetchDevices(token);
      fetchActiveAlerts(token);
    } else {
      setContacts([]);
      setDevices([]);
      setActiveAlert(null);
    }
  }, [token]);

  // Periodic background tracking simulation
  useEffect(() => {
    let intervalId: any = null;

    if (token && currentScreen === 'DASHBOARD' && devices.length > 0) {
      const logCurrentLocation = async () => {
        const primaryDevice = devices[0];
        if (!primaryDevice.id) return;
        
        // Mock current device location around standard coords
        const mockLat = 37.7749 + (Math.random() - 0.5) * 0.01;
        const mockLng = -122.4194 + (Math.random() - 0.5) * 0.01;

        console.log(`[Tracking] Logging location for device: ${primaryDevice.deviceName} (ID: ${primaryDevice.id})`);
        await apiService.logLocation(token, {
          deviceId: primaryDevice.id,
          latitude: mockLat,
          longitude: mockLng,
          accuracy: 10.0
        });
      };

      // Log immediately
      logCurrentLocation();

      // Log coordinates every 30 seconds
      intervalId = setInterval(logCurrentLocation, 30000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [token, currentScreen, devices]);

  // Add Trusted Contact
  const handleAddContact = async () => {
    const { contactName, contactPhone, contactEmail, relationship } = contactForm;
    if (!contactName || !contactPhone) {
      triggerFeedback('Contact name and phone number are required.');
      return;
    }
    if (!token) {
      triggerFeedback('Auth session expired. Please log in again.');
      setCurrentScreen('WELCOME');
      return;
    }

    setLoading(true);
    const result = await apiService.addContact(token, {
      contactName,
      contactPhone,
      contactEmail: contactEmail.trim() || undefined,
      relationship,
    });
    setLoading(false);

    if (result.success && result.data) {
      setContacts(prev => [result.data!, ...prev]);
      setCurrentScreen('DASHBOARD');
      setContactForm({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        relationship: 'Friend',
      });
      triggerFeedback('Contact added to safety circle!', false);
    } else {
      triggerFeedback(result.message || 'Failed to add contact.');
    }
  };

  // Delete Trusted Contact
  const handleDeleteContact = async (contactId: string) => {
    if (!token) return;

    Alert.alert(
      'Remove Contact',
      'Are you sure you want to remove this contact from your safety circle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await apiService.deleteContact(token, contactId);
            setLoading(false);
            if (result.success) {
              setContacts(prev => prev.filter(c => c.id !== contactId));
              triggerFeedback('Contact removed successfully.', false);
            } else {
              triggerFeedback(result.message || 'Failed to remove contact.');
            }
          },
        },
      ]
    );
  };

  // Sign out
  const handleLogOut = async () => {
    try {
      await AsyncStorage.removeItem('@safecircle_token');
      await AsyncStorage.removeItem('@safecircle_user');
      await GoogleSignin.signOut();
    } catch (e) {
      console.log('Error clearing session cache:', e);
    }
    setToken(null);
    setUser(null);
    setDevices([]);
    setCurrentScreen('WELCOME');
    triggerFeedback('Logged out successfully.', false);
  };

  // SOS button press action
  const triggerSosSignal = async () => {
    if (!token) return;

    // Use current location (simulated GPS coordinates)
    const mockLat = 37.7749 + (Math.random() - 0.5) * 0.01;
    const mockLng = -122.4194 + (Math.random() - 0.5) * 0.01;

    setLoading(true);
    const result = await apiService.triggerAlert(token, {
      alertType: 'SOS',
      deviceId: devices[0]?.id || undefined,
      latitude: mockLat,
      longitude: mockLng
    });
    setLoading(false);

    if (result.success && result.data) {
      const activeAlertData = result.data;
      setActiveAlert(activeAlertData);
      triggerFeedback('SOS Alert triggered! Safety contacts notified.', false);

      // Auto-upload initial ambient audio after a short delay (1.5 seconds) to check api correctness
      setTimeout(async () => {
        const mockAudioFile = {
          uri: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGFtZTMuOTguNFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
          type: 'audio/mp3',
          name: `sos-auto-ambient-${activeAlertData.id.slice(-4)}.mp3`,
        };
        await apiService.uploadAmbientAudio(token, activeAlertData.id, mockAudioFile);
        
        // Refresh alert status to get audio URL
        const activeRes = await apiService.getActiveAlerts(token);
        if (activeRes.success && activeRes.data && activeRes.data.length > 0) {
          setActiveAlert(activeRes.data[0]);
        }
      }, 1500);
    } else {
      triggerFeedback(result.message || 'Failed to trigger SOS alert.');
    }
  };

  // Upload Ambient Audio manual trigger
  const handleUploadAmbientAudio = async () => {
    if (!token || !activeAlert) return;
    setLoading(true);
    
    const mockAudioFile = {
      uri: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGFtZTMuOTguNFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
      type: 'audio/mp3',
      name: `ambient-sos-snapshot-${Date.now().toString().slice(-4)}.mp3`,
    };

    const result = await apiService.uploadAmbientAudio(token, activeAlert.id, mockAudioFile);
    setLoading(false);

    if (result.success && result.data) {
      setActiveAlert(result.data);
      triggerFeedback('Ambient safety audio uploaded successfully!', false);
    } else {
      triggerFeedback(result.message || 'Failed to upload ambient audio.');
    }
  };

  // Verify access code and join tracking screen
  const handleVerifyTrackerCode = async (codeStr?: string) => {
    const code = codeStr || trackerCode;
    if (!code || code.length !== 6) {
      triggerFeedback('Please enter a valid 6-digit access code.');
      return;
    }

    setLoading(true);
    const result = await apiService.verifyAccessCode(code);
    setLoading(false);

    if (result.success && result.data) {
      if (!result.data.isActiveSos) {
        triggerFeedback('Access Denied: This access code is active, but the user is not in an active SOS emergency state.');
        return;
      }
      setTrackerInfo(result.data);
      
      // Fetch initial history logs
      const logResult = await apiService.getSharedLocationHistory(code);
      if (logResult.success && logResult.data) {
        setTrackerLogs(logResult.data);
      }
      setCurrentScreen('TRACKER_DASHBOARD');
      triggerFeedback('Secure connection established!', false);
    } else {
      triggerFeedback(result.message || 'Access Denied: Invalid security code.');
    }
  };

  // Resolve active SOS Alert
  const handleResolveAlert = async () => {
    if (!token || !activeAlert) return;

    setLoading(true);
    const result = await apiService.resolveAlert(token, activeAlert.id);
    setLoading(false);

    if (result.success) {
      setActiveAlert(null);
      triggerFeedback('SOS Alert resolved. You are marked as safe.', false);
    } else {
      triggerFeedback(result.message || 'Failed to resolve SOS alert.');
    }
  };

  // Effect: Periodic tracking coordinate poll during tracking session
  useEffect(() => {
    let intervalId: any = null;

    if (currentScreen === 'TRACKER_DASHBOARD' && trackerInfo) {
      const pollTrackerUpdates = async () => {
        const verifyRes = await apiService.verifyAccessCode(trackerCode);
        if (verifyRes.success && verifyRes.data) {
          if (!verifyRes.data.isActiveSos) {
            triggerFeedback('Emergency SOS has been resolved by the user.', false);
            setCurrentScreen('WELCOME');
            setTrackerInfo(null);
            setTrackerLogs([]);
            return;
          }
          setTrackerInfo(verifyRes.data);
        }
      };

      pollTrackerUpdates();
      intervalId = setInterval(pollTrackerUpdates, 8000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentScreen, trackerInfo, trackerCode]);

  // Effect: Establish WebSocket connection for real-time safety updates
  useEffect(() => {
    if (currentScreen === 'TRACKER_DASHBOARD' && trackerInfo && trackerInfo.deviceId) {
      const deviceId = trackerInfo.deviceId;
      console.log(`Connecting to WebSocket Server at ${API_BASE_URL} for device: ${deviceId}`);
      
      // Initialize Socket connection
      const socket = io(API_BASE_URL, {
        transports: ['websocket'], // Use WebSocket transport primarily
        forceNew: true
      });
      
      socket.on('connect', () => {
        console.log('WebSocket Connected successfully! Joining device room:', deviceId);
        socket.emit('join-device-room', { deviceId });
      });

      socket.on('location-broadcast', (newLog: any) => {
        console.log('Received location-broadcast event via WebSocket:', newLog);
        if (newLog) {
          setTrackerLogs(prevLogs => {
            // Avoid duplicate coordinate logs in chronological list representation
            const exists = prevLogs.some(log => (log.id && log.id === newLog.id) || log.timestamp === newLog.timestamp);
            if (exists) return prevLogs;
            return [newLog, ...prevLogs];
          });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket Disconnected:', reason);
      });

      socketRef.current = socket;

      return () => {
        console.log('Cleaning up WebSocket connection for device:', deviceId);
        if (socket) {
          socket.disconnect();
        }
        socketRef.current = null;
      };
    }
  }, [currentScreen, trackerInfo]);

  // Effect: Simulate audio player progress increments
  useEffect(() => {
    let intervalId: any = null;
    if (trackerAudioPlaying) {
      intervalId = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setTrackerAudioPlaying(false);
            return 0;
          }
          return prev + 5;
        });
      }, 500);
    } else {
      if (intervalId) clearInterval(intervalId);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [trackerAudioPlaying]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Alert Banners */}
      {errorMessage && (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>⚠️ {errorMessage}</Text>
        </View>
      )}
      {successMessage && (
        <View style={[styles.banner, styles.bannerSuccess]}>
          <Text style={styles.bannerText}>✅ {successMessage}</Text>
        </View>
      )}

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* ==================== SCREEN 1: WELCOME / LOGIN ==================== */}
        {currentScreen === 'WELCOME' && (
          <ScrollView contentContainerStyle={styles.scrollContentCenter}>
            <View style={styles.heroSection}>
              <Image
                source={require('./assets/logo.png')}
                style={styles.logoImage}
              />
              <Text style={styles.title}>SafeCircle</Text>
              <Text style={styles.tagline}>Smart Personal Security System</Text>
            </View>

            <View style={styles.buttonContainer}>
                {/* Email/Password Login Card */}
                <View style={styles.loginCard}>
                  <Text style={styles.loginCardHeading}>Sign In</Text>

                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    placeholder="name@example.com"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    value={signInForm.email}
                    onChangeText={text => setSignInForm(prev => ({ ...prev, email: text }))}
                  />

                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor="#64748B"
                      secureTextEntry={!showPassword}
                      style={styles.passwordInput}
                      value={signInForm.password}
                      onChangeText={text => setSignInForm(prev => ({ ...prev, password: text }))}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggleBtn}
                      onPress={() => setShowPassword(prev => !prev)}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.disabledButton]}
                    onPress={handleLocalLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleNativeGoogleLogin}
                  disabled={loading}
                >
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setCurrentScreen('SIGNUP')}
                >
                  <Text style={styles.secondaryButtonText}>Create Local Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: '#10B981', marginTop: -8 }]}
                  onPress={() => {
                    setTrackerCode('');
                    setTrackerInfo(null);
                    setTrackerLogs([]);
                    setCurrentScreen('TRACKER_AUTH');
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: '#34D399' }]}>🛡️ Circle Member Tracker Portal</Text>
                </TouchableOpacity>

                <View style={styles.metaInfo}>
                  <Text style={styles.metaText}>Backend Port: 5001</Text>
                  <Text style={styles.metaText}>Status: Connected to Database</Text>
                </View>
              </View>
          </ScrollView>
        )}

        {/* ==================== SCREEN 2: SIGN UP ==================== */}
        {currentScreen === 'SIGNUP' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity
                onPress={() => setCurrentScreen('WELCOME')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Image
                source={require('./assets/logo.png')}
                style={styles.miniLogo}
              />
              <Text style={styles.subTitle}>Create Account</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                placeholder="John Doe"
                placeholderTextColor="#64748B"
                style={styles.input}
                value={signUpForm.fullName}
                onChangeText={text => setSignUpForm(prev => ({ ...prev, fullName: text }))}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                placeholder="john.doe@example.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                value={signUpForm.email}
                onChangeText={text => setSignUpForm(prev => ({ ...prev, email: text }))}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                placeholder="+1234567890"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                style={styles.input}
                value={signUpForm.phoneNumber}
                onChangeText={text => setSignUpForm(prev => ({ ...prev, phoneNumber: text }))}
              />

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showSignUpPassword}
                  style={styles.passwordInput}
                  value={signUpForm.password}
                  onChangeText={text => setSignUpForm(prev => ({ ...prev, password: text }))}
                />
                <TouchableOpacity
                  style={styles.passwordToggleBtn}
                  onPress={() => setShowSignUpPassword(prev => !prev)}
                >
                  <Text style={styles.passwordToggleText}>
                    {showSignUpPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  placeholder="Repeat password"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showSignUpConfirmPassword}
                  style={styles.passwordInput}
                  value={signUpForm.confirmPassword}
                  onChangeText={text => setSignUpForm(prev => ({ ...prev, confirmPassword: text }))}
                />
                <TouchableOpacity
                  style={styles.passwordToggleBtn}
                  onPress={() => setShowSignUpConfirmPassword(prev => !prev)}
                >
                  <Text style={styles.passwordToggleText}>
                    {showSignUpConfirmPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleLocalRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Register User</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ==================== SCREEN 2.5: GOOGLE PHONE REGISTRATION ==================== */}
        {currentScreen === 'GOOGLE_PHONE_REGISTER' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity
                onPress={() => {
                  setToken(null);
                  setUser(null);
                  AsyncStorage.removeItem('@safecircle_token');
                  AsyncStorage.removeItem('@safecircle_user');
                  setCurrentScreen('WELCOME');
                }}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Cancel</Text>
              </TouchableOpacity>
              <Image
                source={require('./assets/logo.png')}
                style={styles.miniLogo}
              />
              <Text style={styles.subTitle}>Complete Profile</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.googleBrandHeader}>
                <Text style={styles.googleBrandLogo}>Google Account Verified</Text>
                <Text style={styles.googleBrandTitle}>Phone Number Required</Text>
                <Text style={styles.googleBrandSubheading}>
                  Welcome, {user?.fullName || 'User'}! Please register your mobile number to complete your profile and enable emergency alert notifications.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Mobile Phone Number</Text>
              <TextInput
                placeholder="+1234567890"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                style={styles.input}
                value={googlePhoneInput}
                onChangeText={setGooglePhoneInput}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleUpdateGooglePhone}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Complete Registration</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ==================== SCREEN 3: DASHBOARD ==================== */}
        {currentScreen === 'DASHBOARD' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Dashboard Header */}
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.welcomeText}>Hello,</Text>
                <Text style={styles.profileNameText}>{user?.fullName || 'User'}</Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogOut}>
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            {/* Profile Info Summary */}
            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryText}>📧 {user?.email}</Text>
              {user?.phoneNumber ? (
                <Text style={styles.profileSummaryText}>📱 {user.phoneNumber}</Text>
              ) : (
                <Text style={styles.profileSummaryText}>🌐 Logged in with Google</Text>
              )}
            </View>

            {/* Emergency SOS Center */}
            <View style={styles.sosContainer}>
              {activeAlert ? (
                <>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                      style={[styles.sosButton, { backgroundColor: '#7F1D1D', borderColor: '#EF4444' }]}
                      disabled
                    >
                      <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <Text style={[styles.trackingStatusText, { color: '#EF4444', marginBottom: 8 }]}>🚨 Active SOS Broadcast Running</Text>

                  {/* Ambient Audio Capture Section */}
                  <View style={styles.audioRecordCard}>
                    <View style={styles.audioRecordRow}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.audioRecordHeading}>Recording Ambient Audio...</Text>
                    </View>
                    <Text style={styles.audioRecordText}>
                      {activeAlert.audioFileUrl
                        ? '✅ Safety ambient recording uploaded and shared with circle contacts.'
                        : '🎙️ Generating and uploading environment sound clip...'}
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.recordManualButton}
                      onPress={handleUploadAmbientAudio}
                      disabled={loading}
                    >
                      <Text style={styles.recordManualButtonText}>
                        {loading ? 'Uploading Snapshot...' : '🎙️ Upload New Audio Snapshot'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#10B981', marginTop: 16, paddingHorizontal: 24 }]}
                    onPress={handleResolveAlert}
                  >
                    <Text style={styles.primaryButtonText}>✅ I am Safe - Resolve SOS</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity style={styles.sosButton} onPress={triggerSosSignal}>
                      <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <Text style={styles.trackingStatusText}>🟢 System Online & Tracking</Text>
                </>
              )}
            </View>

            {/* Devices Section */}
            <View style={styles.devicesSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>My Devices</Text>
                <TouchableOpacity
                  style={styles.addButtonMini}
                  onPress={() => setCurrentScreen('BIND_DEVICE')}
                >
                  <Text style={styles.addButtonMiniText}>+ Bind</Text>
                </TouchableOpacity>
              </View>

              {devices.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTextIcon}>📱</Text>
                  <Text style={styles.emptyText}>No device registered to this account.</Text>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => setCurrentScreen('BIND_DEVICE')}
                  >
                    <Text style={styles.linkButtonText}>Register current device now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                devices.map((device, index) => (
                  <View key={device.id || index} style={styles.deviceListItem}>
                    <View style={styles.deviceRowMain}>
                      <Text style={styles.deviceLabelIcon}>📱</Text>
                      <View style={styles.deviceMetaContainer}>
                        <Text style={styles.deviceItemName}>{device.deviceName}</Text>
                        <Text style={styles.deviceItemDetail}>
                          {device.deviceModel} ({device.deviceOs})
                        </Text>
                        <Text style={styles.deviceImeiText}>IMEI: {device.imeiNumber}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>Linked</Text>
                      </View>
                      <TouchableOpacity
                        style={{ marginTop: 8 }}
                        onPress={() => handleUnbindDevice(device.id)}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Unlink</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Safety Circle Section */}
            <View style={styles.devicesSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Safety Circle</Text>
                <TouchableOpacity
                  style={styles.addButtonMini}
                  onPress={() => setCurrentScreen('ADD_CONTACT')}
                >
                  <Text style={styles.addButtonMiniText}>+ Add Contact</Text>
                </TouchableOpacity>
              </View>

              {contacts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTextIcon}>👥</Text>
                  <Text style={styles.emptyText}>No trusted contacts added yet.</Text>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => setCurrentScreen('ADD_CONTACT')}
                  >
                    <Text style={styles.linkButtonText}>Add a trusted contact now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                contacts.map((contact, index) => (
                  <View key={contact.id || index} style={styles.deviceListItem}>
                    <View style={styles.deviceRowMain}>
                      <Text style={styles.deviceLabelIcon}>👤</Text>
                      <View style={styles.deviceMetaContainer}>
                        <Text style={styles.deviceItemName}>{contact.contactName}</Text>
                        <Text style={styles.deviceItemDetail}>
                          {contact.relationship} • {contact.contactPhone}
                        </Text>
                        {contact.contactEmail ? (
                          <Text style={styles.deviceItemDetail}>{contact.contactEmail}</Text>
                        ) : null}
                        <View style={styles.codeContainer}>
                          <Text style={styles.codeLabelText}>Secure Access Code:</Text>
                          <Text style={styles.codeText}>{contact.accessCode}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeContactButton}
                      onPress={() => handleDeleteContact(contact.id)}
                    >
                      <Text style={styles.removeContactButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* ==================== SCREEN 4: BIND DEVICE ==================== */}
        {currentScreen === 'BIND_DEVICE' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity
                onPress={() => setCurrentScreen('DASHBOARD')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Link Device</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formInstructions}>
                Register your IMEI number to bind your hardware module with the security center.
              </Text>

              <TouchableOpacity style={styles.autoDetectButton} onPress={autoDetectDeviceDetails}>
                <Text style={styles.autoDetectButtonText}>✨ Auto-detect Current Device</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Device Custom Name</Text>
              <TextInput
                placeholder="e.g. My Primary Phone"
                placeholderTextColor="#64748B"
                style={styles.input}
                value={deviceForm.deviceName}
                onChangeText={text => setDeviceForm(prev => ({ ...prev, deviceName: text }))}
              />

              <Text style={styles.inputLabel}>Device Model</Text>
              <TextInput
                placeholder="e.g. iPhone 15 Pro Max"
                placeholderTextColor="#64748B"
                style={styles.input}
                value={deviceForm.deviceModel}
                onChangeText={text => setDeviceForm(prev => ({ ...prev, deviceModel: text }))}
              />

              <Text style={styles.inputLabel}>IMEI / Serial Number</Text>
              <TextInput
                placeholder="15-digit unique serial number"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                style={styles.input}
                value={deviceForm.imeiNumber}
                onChangeText={text => setDeviceForm(prev => ({ ...prev, imeiNumber: text }))}
              />

              <Text style={styles.inputLabel}>Operating System</Text>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, deviceForm.deviceOs === 'Android' && styles.tabButtonActive]}
                  onPress={() => setDeviceForm(prev => ({ ...prev, deviceOs: 'Android' }))}
                >
                  <Text style={[styles.tabButtonText, deviceForm.deviceOs === 'Android' && styles.tabButtonTextActive]}>
                    Android
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, deviceForm.deviceOs === 'iOS' && styles.tabButtonActive]}
                  onPress={() => setDeviceForm(prev => ({ ...prev, deviceOs: 'iOS' }))}
                >
                  <Text style={[styles.tabButtonText, deviceForm.deviceOs === 'iOS' && styles.tabButtonTextActive]}>
                    iOS
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleBindDevice}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Register and Link IMEI</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ==================== SCREEN 5: ADD TRUSTED CONTACT ==================== */}
        {currentScreen === 'ADD_CONTACT' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.subHeader}>
              <TouchableOpacity
                onPress={() => setCurrentScreen('DASHBOARD')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>Add Contact</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formInstructions}>
                Add a contact to your safety circle. The system will automatically generate a secure access code for them.
              </Text>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                placeholder="e.g. Jane Doe"
                placeholderTextColor="#64748B"
                style={styles.input}
                value={contactForm.contactName}
                onChangeText={text => setContactForm(prev => ({ ...prev, contactName: text }))}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                placeholder="e.g. +19999999999"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                style={styles.input}
                value={contactForm.contactPhone}
                onChangeText={text => setContactForm(prev => ({ ...prev, contactPhone: text }))}
              />

              <Text style={styles.inputLabel}>Email Address (Optional)</Text>
              <TextInput
                placeholder="e.g. jane@example.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                value={contactForm.contactEmail}
                onChangeText={text => setContactForm(prev => ({ ...prev, contactEmail: text }))}
              />

              <Text style={styles.inputLabel}>Relationship</Text>
              <View style={styles.tabContainer}>
                {['Friend', 'Family', 'Partner', 'Other'].map(rel => (
                  <TouchableOpacity
                    key={rel}
                    style={[styles.tabButton, contactForm.relationship === rel && styles.tabButtonActive, { flex: 1, marginHorizontal: 2 }]}
                    onPress={() => setContactForm(prev => ({ ...prev, relationship: rel }))}
                  >
                    <Text style={[styles.tabButtonText, contactForm.relationship === rel && styles.tabButtonTextActive, { fontSize: 11 }]}>
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton, { marginTop: 24 }]}
                onPress={handleAddContact}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Add to Safety Circle</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ==================== SCREEN 6: TRACKER ACCESS CODE ENTRY ==================== */}
        {currentScreen === 'TRACKER_AUTH' && (
          <ScrollView contentContainerStyle={styles.scrollContentCenter}>
            <View style={styles.subHeader}>
              <TouchableOpacity
                onPress={() => setCurrentScreen('WELCOME')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Image
                source={require('./assets/logo.png')}
                style={styles.miniLogo}
              />
              <Text style={styles.subTitle}>Safety Tracker Portal</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.trackerIconBig}>🛡️</Text>
              <Text style={styles.trackerTitle}>Secure Access Portal</Text>
              <Text style={styles.formInstructions}>
                Enter the 6-digit secure access code shared by your circle member to establish a secure tracking connection.
              </Text>

              <Text style={styles.inputLabel}>Circle Access Code</Text>
              <TextInput
                placeholder="000000"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={6}
                style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 'bold' }]}
                value={trackerCode}
                onChangeText={setTrackerCode}
              />

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#10B981' }, loading && styles.disabledButton]}
                onPress={() => handleVerifyTrackerCode()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Establish Tracking Connection</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ==================== SCREEN 7: TRACKER ACTIVE DASHBOARD ==================== */}
        {currentScreen === 'TRACKER_DASHBOARD' && trackerInfo && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.welcomeText}>Incident Tracking</Text>
                <Text style={styles.profileNameText}>Security Center</Text>
              </View>
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: '#991B1B', borderColor: '#EF4444' }]}
                onPress={() => {
                  setCurrentScreen('WELCOME');
                  setTrackerInfo(null);
                  setTrackerLogs([]);
                }}
              >
                <Text style={[styles.logoutButtonText, { color: '#FCA5A5' }]}>Disconnect</Text>
              </TouchableOpacity>
            </View>

            {/* Distress Alert Status Banner */}
            <View style={[styles.bannerStatic, { backgroundColor: '#7F1D1D', borderColor: '#EF4444' }]}>
              <Text style={styles.bannerStaticText}>🚨 EMERGENCY SOS BROADCAST ACTIVE</Text>
            </View>

            {/* Target Individual Details Card */}
            <View style={styles.profileSummaryCard}>
              <Text style={[styles.inputLabel, { color: '#F8FAFC', marginBottom: 8 }]}>Distressed Individual</Text>
              <Text style={{ color: '#F8FAFC', fontSize: 20, fontWeight: '800' }}>
                👤 {trackerInfo.targetUser.fullName}
              </Text>
              <Text style={[styles.profileSummaryText, { marginTop: 4 }]}>
                📞 Phone: {trackerInfo.targetUser.phoneNumber || 'N/A'}
              </Text>
              <Text style={styles.profileSummaryText}>
                🤝 Relationship: {trackerInfo.relationship}
              </Text>
            </View>

            {/* Ambient SOS Audio Card */}
            {trackerInfo.audioFileUrl ? (
              <View style={[styles.profileSummaryCard, { backgroundColor: '#1E1B4B', borderColor: '#4F46E5' }]}>
                <Text style={[styles.inputLabel, { color: '#C7D2FE', marginBottom: 8 }]}>🎙️ Ambient SOS Audio</Text>
                <View style={styles.audioPlayerRow}>
                  <TouchableOpacity
                    style={styles.playButtonCircle}
                    onPress={() => setTrackerAudioPlaying(!trackerAudioPlaying)}
                  >
                    <Text style={styles.playButtonIcon}>
                      {trackerAudioPlaying ? '⏸️' : '▶️'}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#F8FAFC', fontWeight: '700', fontSize: 14 }}>
                      {trackerAudioPlaying ? 'Streaming Ambient Recording...' : 'Ambient Recording Available'}
                    </Text>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${audioProgress}%` }]} />
                    </View>
                  </View>
                </View>
                {trackerAudioPlaying && (
                  <View style={styles.waveContainer}>
                    <View style={[styles.waveBar, { height: 12 + Math.random() * 12 }]} />
                    <View style={[styles.waveBar, { height: 6 + Math.random() * 15 }]} />
                    <View style={[styles.waveBar, { height: 10 + Math.random() * 10 }]} />
                    <View style={[styles.waveBar, { height: 16 + Math.random() * 8 }]} />
                    <View style={[styles.waveBar, { height: 8 + Math.random() * 12 }]} />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.profileSummaryCard}>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                  🎙️ Waiting for device ambient audio upload...
                </Text>
              </View>
            )}

            {/* Current Coordinate Card */}
            <View style={styles.profileSummaryCard}>
              <Text style={[styles.inputLabel, { marginBottom: 6 }]}>Live Geolocation Coords</Text>
              <Text style={{ color: '#38BDF8', fontSize: 24, fontWeight: '800', letterSpacing: 0.5 }}>
                📍 {trackerLogs.length > 0
                  ? `${parseFloat(trackerLogs[0].latitude).toFixed(5)}, ${parseFloat(trackerLogs[0].longitude).toFixed(5)}`
                  : 'Searching GPS...'}
              </Text>
              <Text style={[styles.profileSummaryText, { fontSize: 12, color: '#94A3B8', marginTop: 4 }]}>
                Accuracy: {trackerLogs.length > 0 && trackerLogs[0].accuracy
                  ? `${parseFloat(trackerLogs[0].accuracy).toFixed(1)} meters`
                  : 'N/A'} • Active WebSocket Channel
              </Text>
            </View>

            {/* Coordinate Logs History Timeline */}
            <View style={styles.devicesSection}>
              <Text style={[styles.sectionHeading, { marginBottom: 12 }]}>Safety History Timeline</Text>
              {trackerLogs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTextIcon}>🛰️</Text>
                  <Text style={styles.emptyText}>Waiting for device signals to log...</Text>
                </View>
              ) : (
                trackerLogs.map((log, index) => {
                  const logTime = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });
                  return (
                    <View key={log.id || index} style={styles.deviceListItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, marginRight: 12 }}>🗺️</Text>
                        <View>
                          <Text style={{ color: '#F8FAFC', fontWeight: '600', fontSize: 14 }}>
                            {parseFloat(log.latitude).toFixed(5)}, {parseFloat(log.longitude).toFixed(5)}
                          </Text>
                          <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                            Accuracy: {log.accuracy ? parseFloat(log.accuracy).toFixed(1) : 'N/A'} meters
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }}>
                        {logTime}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A', // Premium obsidian background
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  scrollContentCenter: {
    padding: 24,
    paddingBottom: 60,
    flexGrow: 1,
    justifyContent: 'center',
  },
  banner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  bannerError: {
    backgroundColor: '#991B1B',
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
  },
  bannerSuccess: {
    backgroundColor: '#065F46',
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
  },
  bannerText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '400',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    marginRight: 16,
  },
  backButtonText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 14,
  },
  subTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  formHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 18,
  },
  codeSnippet: {
    backgroundColor: '#0F172A',
    color: '#38BDF8',
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  formInstructions: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  autoDetectButton: {
    backgroundColor: '#312E81',
    borderWidth: 1,
    borderColor: '#4F46E5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  autoDetectButtonText: {
    color: '#C7D2FE',
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
  },
  passwordInput: {
    flex: 1,
    color: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordToggleBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleText: {
    fontSize: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
  },
  tabButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: '#38BDF8',
  },
  buttonContainer: {
    width: '100%',
  },
  googleButton: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  googleButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  textButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  metaInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  metaText: {
    color: '#475569',
    fontSize: 12,
    marginVertical: 2,
  },
  googleBrandHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  googleBrandLogo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -1,
    marginBottom: 8,
  },
  googleBrandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  googleBrandSubheading: {
    fontSize: 14,
    color: '#94A3B8',
  },
  googleAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    width: '100%',
  },
  googleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleAvatarText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  googleAccountInfo: {
    flex: 1,
  },
  googleAccountName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  googleAccountEmail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  googleUseAnotherBtn: {
    paddingVertical: 14,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 12,
  },
  googleUseAnotherBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  googleSelectorFooter: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  profileNameText: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#312E81',
    borderWidth: 1,
    borderColor: '#3730A3',
  },
  logoutButtonText: {
    color: '#C7D2FE',
    fontSize: 13,
    fontWeight: '600',
  },
  profileSummaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileSummaryText: {
    color: '#E2E8F0',
    fontSize: 14,
    marginVertical: 4,
  },
  sosContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  sosButton: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#EF4444',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 1,
  },
  trackingStatusText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 24,
  },
  devicesSection: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  addButtonMini: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonMiniText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#475569',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTextIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  linkButtonText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceListItem: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  deviceRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceLabelIcon: {
    fontSize: 26,
    marginRight: 16,
  },
  deviceMetaContainer: {
    flex: 1,
  },
  deviceItemName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceItemDetail: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  deviceImeiText: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#065F46',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  loginCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 24,
  },
  loginCardHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 20,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 16,
  },
  miniLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeLabelText: {
    color: '#94A3B8',
    fontSize: 11,
    marginRight: 6,
  },
  codeText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  removeContactButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#312E81',
    alignSelf: 'center',
  },
  removeContactButtonText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
  // Ambient recording styles
  audioRecordCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    width: '100%',
    alignItems: 'center',
  },
  audioRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  audioRecordHeading: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  audioRecordText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  recordManualButton: {
    backgroundColor: '#312E81',
    borderColor: '#4F46E5',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  recordManualButtonText: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  // Tracker styles
  trackerIconBig: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  trackerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
  },
  bannerStatic: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  bannerStaticText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  audioPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    fontSize: 18,
    marginLeft: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  waveContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 32,
    marginTop: 12,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#818CF8',
    marginHorizontal: 3,
    borderRadius: 2,
  },
});

export default App;