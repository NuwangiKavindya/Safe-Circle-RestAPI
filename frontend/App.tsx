import React, { useState, useEffect, useRef } from 'react';
import { Animated, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import { apiService, API_BASE_URL, SafeZone } from './src/services/api';
import { locationService } from './src/services/locationService';
import {
  ScreenType,
  UserData,
  BoundDevice,
  TrustedContact,
  ApiAlert,
  SignUpFormState,
  SignInFormState,
  DeviceFormState,
  ContactFormState,
} from './src/types';
import { globalStyles } from './src/styles/theme';
import { FeedbackBanner } from './src/components/FeedbackBanner';

import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { GooglePhoneRegisterScreen } from './src/screens/GooglePhoneRegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BindDeviceScreen } from './src/screens/BindDeviceScreen';
import { AddContactScreen } from './src/screens/AddContactScreen';
import { TrackerAuthScreen } from './src/screens/TrackerAuthScreen';
import { TrackerDashboardScreen } from './src/screens/TrackerDashboardScreen';
import { MapViewComponent } from './src/components/MapViewComponent';
import { ARViewComponent } from './src/components/ARViewComponent';

const App = () => {
  // Navigation & Session State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('WELCOME');
  const [previousScreenForMap, setPreviousScreenForMap] = useState<ScreenType>('DASHBOARD');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [devices, setDevices] = useState<BoundDevice[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [activeAlert, setActiveAlert] = useState<ApiAlert | null>(null);

  // Form States
  const [contactForm, setContactForm] = useState<ContactFormState>({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    relationship: 'Friend',
  });
  const [signUpForm, setSignUpForm] = useState<SignUpFormState>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [signInForm, setSignInForm] = useState<SignInFormState>({
    email: '',
    password: '',
  });
  const [deviceForm, setDeviceForm] = useState<DeviceFormState>({
    deviceName: '',
    deviceModel: '',
    imeiNumber: '',
    deviceOs: Platform.OS === 'ios' ? 'iOS' : 'Android',
  });
  const [googlePhoneInput, setGooglePhoneInput] = useState('');

  // Password Visibility Toggle States
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  // Tracker Access Portal State
  const [trackerCode, setTrackerCode] = useState('');
  const [trackerInfo, setTrackerInfo] = useState<any>(null);
  const [trackerLogs, setTrackerLogs] = useState<any[]>([]);
  const [trackerAudioPlaying, setTrackerAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const socketRef = useRef<any>(null);

  // Feedback Banner State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // UI Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulsing animation for active dashboard SOS button
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

    GoogleSignin.configure({
      webClientId: '342423658982-ehokj2fvf0itu21b2t7hs04ucmjcu6nt.apps.googleusercontent.com',
      iosClientId: '342423658982-3sj5f5oiuv6hqduk15mtv69jtet1li4v.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  // Helper: Display floating feedback banner
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

  // Auth Handlers
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
      setDevices([]);
      setCurrentScreen('DASHBOARD');
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
      setDevices([]);
      setCurrentScreen('DASHBOARD');
      setSignInForm({ email: '', password: '' });
      triggerFeedback('Logged in successfully!', false);
    } else {
      triggerFeedback(result.message || 'Invalid email or password.');
    }
  };

  const handleNativeGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try {
        await GoogleSignin.signOut();
      } catch {
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

  // Device Handlers
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

  const autoDetectDeviceDetails = () => {
    setDeviceForm({
      deviceName: `${Platform.OS === 'ios' ? 'My Simulator' : 'Android Virtual Device'}`,
      deviceModel: Platform.OS === 'ios' ? 'iPhone 15 Pro' : 'Pixel 8 Pro',
      imeiNumber: Math.floor(100000000000000 + Math.random() * 900000000000000).toString(),
      deviceOs: Platform.OS === 'ios' ? 'iOS' : 'Android',
    });
  };

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

  useEffect(() => {
    if (token) {
      const loadInitialData = async () => {
        setLoading(true);
        const [cRes, dRes, aRes, zRes] = await Promise.all([
          apiService.getContacts(token),
          apiService.getDevices(token),
          apiService.getActiveAlerts(token),
          apiService.getSafeZones(token),
        ]);
        setLoading(false);

        if (cRes.success && cRes.data) {
          setContacts(cRes.data);
        } else if (!cRes.success) {
          triggerFeedback(cRes.message || 'Failed to load safety contacts.');
        }

        if (dRes.success && dRes.data) {
          const mappedDevices = dRes.data.map((d: any) => ({
            id: d.id,
            deviceName: d.deviceName,
            deviceModel: d.deviceModel,
            imeiNumber: d.imeiNumber,
            deviceOs: d.deviceOs,
            createdAt: d.createdAt,
          }));
          setDevices(mappedDevices);
        } else if (!dRes.success) {
          triggerFeedback(dRes.message || 'Failed to load registered devices.');
        }

        if (aRes.success && aRes.data && aRes.data.length > 0) {
          setActiveAlert(aRes.data[0]);
        } else {
          setActiveAlert(null);
        }

        if (zRes.success && zRes.data) {
          setSafeZones(zRes.data);
        }
      };
      loadInitialData();
    } else {
      setContacts([]);
      setDevices([]);
      setSafeZones([]);
      setActiveAlert(null);
    }
  }, [token]);

  // Safe Zone Handlers
  const handleCreateSafeZone = async (zoneName: string, radiusMeters: number) => {
    if (!token) return;
    const currentLat = 37.7749;
    const currentLng = -122.4194;

    setLoading(true);
    const result = await apiService.createSafeZone(token, {
      zoneName,
      latitude: currentLat,
      longitude: currentLng,
      radiusMeters,
    });
    setLoading(false);

    if (result.success && result.data) {
      setSafeZones(prev => [result.data!, ...prev]);
      triggerFeedback(`Safe Zone "${zoneName}" (${radiusMeters}m) created!`, false);
    } else {
      triggerFeedback(result.message || 'Failed to create safe zone.');
    }
  };

  const handleDeleteSafeZone = async (safeZoneId: string) => {
    if (!token) return;
    Alert.alert(
      'Remove Safe Zone',
      'Are you sure you want to remove this Safe Zone geofence?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await apiService.deleteSafeZone(token, safeZoneId);
            setLoading(false);
            if (result.success) {
              setSafeZones(prev => prev.filter(z => z.id !== safeZoneId));
              triggerFeedback('Safe Zone removed successfully.', false);
            } else {
              triggerFeedback(result.message || 'Failed to delete safe zone.');
            }
          },
        },
      ]
    );
  };

  // Real-Time GPS location tracking using Google Fused Location Provider API & WebSockets
  useEffect(() => {
    if (token && currentScreen === 'DASHBOARD' && devices.length > 0) {
      const primaryDevice = devices[0];
      if (primaryDevice && primaryDevice.id) {
        console.log(`[Fused Location Provider] Initializing live GPS tracking for device: ${primaryDevice.deviceName} (ID: ${primaryDevice.id})`);
        
        // Ensure Socket.IO client instance exists for socket emission
        if (!socketRef.current) {
          socketRef.current = io(API_BASE_URL, {
            transports: ['websocket'],
            forceNew: true,
          });
        }

        locationService.startLocationTracking(
          primaryDevice.id,
          token,
          socketRef.current
        );
      }
    } else {
      locationService.stopLocationTracking();
    }

    return () => {
      locationService.stopLocationTracking();
    };
  }, [token, currentScreen, devices]);

  // Safety Circle Contact Handlers
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

  // SOS Signal Handlers
  const triggerSosSignal = async () => {
    if (!token) return;

    const mockLat = 37.7749 + (Math.random() - 0.5) * 0.01;
    const mockLng = -122.4194 + (Math.random() - 0.5) * 0.01;

    setLoading(true);
    const result = await apiService.triggerAlert(token, {
      alertType: 'SOS',
      deviceId: devices[0]?.id || undefined,
      latitude: mockLat,
      longitude: mockLng,
    });
    setLoading(false);

    if (result.success && result.data) {
      const activeAlertData = result.data;
      setActiveAlert(activeAlertData);
      triggerFeedback('SOS Alert triggered! Safety contacts notified.', false);

      setTimeout(async () => {
        const mockAudioFile = {
          uri: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGFtZTMuOTguNFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
          type: 'audio/mp3',
          name: `sos-auto-ambient-${activeAlertData.id.slice(-4)}.mp3`,
        };
        await apiService.uploadAmbientAudio(token, activeAlertData.id, mockAudioFile);

        const activeRes = await apiService.getActiveAlerts(token);
        if (activeRes.success && activeRes.data && activeRes.data.length > 0) {
          setActiveAlert(activeRes.data[0]);
        }
      }, 1500);
    } else {
      triggerFeedback(result.message || 'Failed to trigger SOS alert.');
    }
  };

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

  // Tracker Portal Handlers & Effects
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

  useEffect(() => {
    if (currentScreen === 'TRACKER_DASHBOARD' && trackerInfo && trackerInfo.deviceId) {
      const deviceId = trackerInfo.deviceId;
      console.log(`Connecting to WebSocket Server at ${API_BASE_URL} for device: ${deviceId}`);

      const socket = io(API_BASE_URL, {
        transports: ['websocket'],
        forceNew: true,
      });

      socket.on('connect', () => {
        console.log('WebSocket Connected successfully! Joining device room:', deviceId);
        socket.emit('join-device-room', { deviceId });
      });

      socket.on('location-broadcast', (newLog: any) => {
        console.log('Received location-broadcast event via WebSocket:', newLog);
        if (newLog) {
          setTrackerLogs(prevLogs => {
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
    <SafeAreaView style={globalStyles.safeArea}>
      <FeedbackBanner errorMessage={errorMessage} successMessage={successMessage} />

      <Animated.View style={[globalStyles.container, { opacity: fadeAnim }]}>
        {currentScreen === 'WELCOME' && (
          <WelcomeScreen
            signInForm={signInForm}
            setSignInForm={setSignInForm}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
            onLocalLogin={handleLocalLogin}
            onNativeGoogleLogin={handleNativeGoogleLogin}
            onNavigateSignUp={() => setCurrentScreen('SIGNUP')}
            onNavigateTrackerAuth={() => {
              setTrackerCode('');
              setTrackerInfo(null);
              setTrackerLogs([]);
              setCurrentScreen('TRACKER_AUTH');
            }}
          />
        )}

        {currentScreen === 'SIGNUP' && (
          <SignUpScreen
            signUpForm={signUpForm}
            setSignUpForm={setSignUpForm}
            showSignUpPassword={showSignUpPassword}
            setShowSignUpPassword={setShowSignUpPassword}
            showSignUpConfirmPassword={showSignUpConfirmPassword}
            setShowSignUpConfirmPassword={setShowSignUpConfirmPassword}
            loading={loading}
            onLocalRegister={handleLocalRegister}
            onNavigateWelcome={() => setCurrentScreen('WELCOME')}
          />
        )}

        {currentScreen === 'GOOGLE_PHONE_REGISTER' && (
          <GooglePhoneRegisterScreen
            user={user}
            googlePhoneInput={googlePhoneInput}
            setGooglePhoneInput={setGooglePhoneInput}
            loading={loading}
            onUpdateGooglePhone={handleUpdateGooglePhone}
            onCancel={() => {
              setToken(null);
              setUser(null);
              AsyncStorage.removeItem('@safecircle_token');
              AsyncStorage.removeItem('@safecircle_user');
              setCurrentScreen('WELCOME');
            }}
          />
        )}

        {currentScreen === 'DASHBOARD' && (
          <DashboardScreen
            user={user}
            devices={devices}
            contacts={contacts}
            safeZones={safeZones}
            activeAlert={activeAlert}
            pulseAnim={pulseAnim}
            loading={loading}
            onLogOut={handleLogOut}
            onTriggerSos={triggerSosSignal}
            onResolveAlert={handleResolveAlert}
            onUploadAmbientAudio={handleUploadAmbientAudio}
            onNavigateBindDevice={() => setCurrentScreen('BIND_DEVICE')}
            onNavigateAddContact={() => setCurrentScreen('ADD_CONTACT')}
            onNavigateFullScreenMap={() => {
              setPreviousScreenForMap('DASHBOARD');
              setCurrentScreen('FULLSCREEN_MAP');
            }}
            onCreateSafeZone={handleCreateSafeZone}
            onDeleteSafeZone={handleDeleteSafeZone}
            onUnbindDevice={handleUnbindDevice}
            onDeleteContact={handleDeleteContact}
          />
        )}

        {currentScreen === 'BIND_DEVICE' && (
          <BindDeviceScreen
            deviceForm={deviceForm}
            setDeviceForm={setDeviceForm}
            loading={loading}
            onBindDevice={handleBindDevice}
            onAutoDetect={autoDetectDeviceDetails}
            onNavigateDashboard={() => setCurrentScreen('DASHBOARD')}
          />
        )}

        {currentScreen === 'ADD_CONTACT' && (
          <AddContactScreen
            contactForm={contactForm}
            setContactForm={setContactForm}
            loading={loading}
            onAddContact={handleAddContact}
            onNavigateDashboard={() => setCurrentScreen('DASHBOARD')}
          />
        )}

        {currentScreen === 'TRACKER_AUTH' && (
          <TrackerAuthScreen
            trackerCode={trackerCode}
            setTrackerCode={setTrackerCode}
            loading={loading}
            onVerifyTrackerCode={handleVerifyTrackerCode}
            onNavigateWelcome={() => setCurrentScreen('WELCOME')}
          />
        )}

        {currentScreen === 'TRACKER_DASHBOARD' && trackerInfo && (
          <TrackerDashboardScreen
            trackerInfo={trackerInfo}
            trackerLogs={trackerLogs}
            trackerAudioPlaying={trackerAudioPlaying}
            audioProgress={audioProgress}
            onToggleAudioPlaying={() => setTrackerAudioPlaying(!trackerAudioPlaying)}
            onNavigateFullScreenMap={() => {
              setPreviousScreenForMap('TRACKER_DASHBOARD');
              setCurrentScreen('FULLSCREEN_MAP');
            }}
            onDisconnect={() => {
              setCurrentScreen('WELCOME');
              setTrackerInfo(null);
              setTrackerLogs([]);
            }}
          />
        )}

        {currentScreen === 'FULLSCREEN_MAP' && (
          <MapViewComponent
            latitude={
              previousScreenForMap === 'TRACKER_DASHBOARD' && trackerLogs.length > 0
                ? parseFloat(trackerLogs[0].latitude)
                : activeAlert && activeAlert.latitude
                ? parseFloat(String(activeAlert.latitude))
                : 37.7749
            }
            longitude={
              previousScreenForMap === 'TRACKER_DASHBOARD' && trackerLogs.length > 0
                ? parseFloat(trackerLogs[0].longitude)
                : activeAlert && activeAlert.longitude
                ? parseFloat(String(activeAlert.longitude))
                : -122.4194
            }
            accuracy={
              previousScreenForMap === 'TRACKER_DASHBOARD' && trackerLogs.length > 0 && trackerLogs[0].accuracy
                ? parseFloat(trackerLogs[0].accuracy)
                : 10.0
            }
            logs={previousScreenForMap === 'TRACKER_DASHBOARD' ? trackerLogs : []}
            safeZones={safeZones}
            targetName={
              previousScreenForMap === 'TRACKER_DASHBOARD' && trackerInfo
                ? trackerInfo.targetUser.fullName
                : user?.fullName || 'Primary Device'
            }
            height="100%"
            isFullScreen={true}
            onBack={() => setCurrentScreen(previousScreenForMap || 'DASHBOARD')}
            onOpenARView={() => setCurrentScreen('AR_VIEW')}
          />
        )}

        {currentScreen === 'AR_VIEW' && (
          <ARViewComponent
            userLatitude={37.7749}
            userLongitude={-122.4194}
            targetLatitude={
              previousScreenForMap === 'TRACKER_DASHBOARD' && trackerLogs.length > 0
                ? parseFloat(trackerLogs[0].latitude)
                : activeAlert && activeAlert.latitude
                ? parseFloat(String(activeAlert.latitude))
                : 37.7752
            }
            targetLongitude={
              previousScreenForMap === 'TRACKER_DASHBOARD' && trackerLogs.length > 0
                ? parseFloat(trackerLogs[0].longitude)
                : activeAlert && activeAlert.longitude
                ? parseFloat(String(activeAlert.longitude))
                : -122.4190
            }
            targetName={
              previousScreenForMap === 'TRACKER_DASHBOARD' && trackerInfo
                ? trackerInfo.targetUser.fullName
                : user?.fullName || 'Target Device'
            }
            onBack={() => setCurrentScreen('FULLSCREEN_MAP')}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

export default App;