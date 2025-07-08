# Profile Page Documentation

## Overview
The Profile page is a comprehensive user profile management interface that displays user statistics, achievements, game history, and account settings. It provides a rich user experience with real-time data visualization and interactive features.

## Features

### 🎯 Core Functionality
- **User Profile Display**: Shows user information, avatar, level, and XP progress
- **Statistics Dashboard**: Comprehensive game statistics and performance metrics
- **Achievement System**: Unlocked achievements and progress tracking
- **Game History**: Recent games with detailed results
- **Avatar Management**: Upload, preview, and delete profile pictures
- **Password Management**: Secure password change functionality
- **Admin Panel**: Administrative tools for admin users

### 📊 Statistics Display
- **Win/Loss Records**: Games won, lost, and total games played
- **Performance Metrics**: Win rate, accuracy rate, correct answers
- **Progress Tracking**: Current streak, best score, active days
- **Comparison Stats**: User ranking compared to other players
- **XP System**: Level progress and experience points

### 🏆 Achievement System
- **Unlocked Achievements**: Display earned achievements with icons
- **Progress Tracking**: Show progress towards upcoming achievements
- **Achievement Categories**:
  - First Steps (10 wins)
  - Quiz Master (50 wins)
  - Legend (100 wins)
  - High Achiever (70%+ win rate)
  - Knowledge Seeker (500+ correct answers)
  - Dedicated Player (1000+ total answers)

## Technical Implementation

### 🏗️ Architecture
- **Component Structure**: Modular React component with TypeScript
- **State Management**: React hooks (useState, useEffect, useRef)
- **API Integration**: RESTful API calls for data fetching
- **Real-time Updates**: WebSocket integration for live data
- **Error Handling**: Comprehensive error handling and user feedback

### 🔧 Key Components
```typescript
// Main Profile Component
const ProfilePage: React.FC = () => {
  // State management for user data, stats, UI states
  // API integration for data fetching
  // Event handlers for user interactions
}
```

### 📡 API Endpoints Used
- `GET /stats/user-winloss/{userId}` - User statistics
- `GET /stats/recent-games` - Recent game history
- `POST /users/{userId}/change-password` - Password change
- `POST /users/avatar` - Avatar upload
- `DELETE /users/avatar` - Avatar deletion

### 🎨 UI/UX Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Theme**: Consistent dark theme throughout
- **Loading States**: Skeleton loading and spinners
- **Interactive Elements**: Hover effects, transitions, animations
- **Accessibility**: ARIA labels, keyboard navigation
- **Drag & Drop**: Avatar upload with drag and drop support

## File Structure

```
frontend/src/pages/Profile/
├── ProfilePage.tsx          # Main profile component
├── README.md               # This documentation
└── README.fa.md           # Persian documentation

Dependencies:
├── components/UI/
│   ├── Avatar.tsx         # Avatar display component
│   ├── Button.tsx         # Reusable button component
│   ├── Card.tsx           # Card container component
│   ├── LoadingSpinner.tsx # Loading indicator
│   └── Snackbar.tsx       # Notification component
├── components/Admin/
│   └── AdminPanel.tsx     # Admin interface
├── services/
│   └── api.ts            # API service functions
└── contexts/
    └── AuthContext.tsx   # Authentication context
```

## State Management

### 🔄 Local State
```typescript
// User data and statistics
const [userStats, setUserStats] = useState<any>(null);
const [recentGames, setRecentGames] = useState<any[]>([]);

// UI states
const [loading, setLoading] = useState(true);
const [editing, setEditing] = useState(false);
const [showGameHistory, setShowGameHistory] = useState(false);

// Avatar management
const [avatarFile, setAvatarFile] = useState<File | null>(null);
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
const [avatarLoading, setAvatarLoading] = useState(false);

// Password management
const [passwordForm, setPasswordForm] = useState({...});
const [passwordErrors, setPasswordErrors] = useState({...});
const [passwordLoading, setPasswordLoading] = useState(false);

// Notifications
const [snackbar, setSnackbar] = useState<{message: string, type: 'success' | 'error'} | null>(null);
```

### 📊 Computed States
```typescript
// Calculated from user data
const [currentStreak, setCurrentStreak] = useState<number | null>(null);
const [bestScore, setBestScore] = useState<{score: string, accuracy: number} | null>(null);
const [activeDays, setActiveDays] = useState<number | null>(null);
const [comparisonStats, setComparisonStats] = useState<any>(null);
```

## Key Functions

### 🔄 Data Loading
```typescript
const loadUserStats = async () => {
  // Fetch user statistics from API
  const response = await statsAPI.getUserWinLoss(user.id);
  setUserStats(response.data);
};

const loadRecentGames = async () => {
  // Fetch recent games history
  const response = await statsAPI.getRecentGames();
  setRecentGames(response.data);
};
```

### 🖼️ Avatar Management
```typescript
const handleAvatarUpload = async () => {
  // Upload avatar file to server
  const response = await authAPI.uploadAvatar(avatarFile);
  updateUser({ ...user, avatar: response.data.avatar });
};

const handleAvatarDelete = async () => {
  // Delete current avatar
  await authAPI.deleteAvatar();
  updateUser({ ...user, avatar: undefined });
};
```

### 🔐 Password Management
```typescript
const handlePasswordChange = async () => {
  // Validate and change password
  await authAPI.changePassword(user.id, {
    currentPassword: passwordForm.currentPassword,
    newPassword: passwordForm.newPassword
  });
};
```

## Styling & Theming

### 🎨 Design System
- **Color Palette**: Dark theme with primary/secondary colors
- **Typography**: Consistent font hierarchy
- **Spacing**: Tailwind CSS spacing system
- **Shadows**: Layered shadow system for depth
- **Gradients**: Subtle gradients for visual appeal

### 📱 Responsive Breakpoints
```css
/* Mobile First Approach */
.sm: 640px   /* Small devices */
.md: 768px   /* Medium devices */
.lg: 1024px  /* Large devices */
.xl: 1280px  /* Extra large devices */
```

## Performance Optimizations

### ⚡ Optimization Techniques
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive calculations
- **Debouncing**: Input field debouncing
- **Image Optimization**: Avatar compression and caching
- **Code Splitting**: Dynamic imports for large components

### 🔄 Data Caching
- **API Response Caching**: Cache frequently accessed data
- **Local Storage**: Persist user preferences
- **Session Storage**: Temporary data storage

## Error Handling

### 🛡️ Error Management
```typescript
// API Error Handling
try {
  const response = await apiCall();
  setData(response.data);
} catch (error) {
  console.error('API Error:', error);
  showSnackbar('Failed to load data', 'error');
}

// Form Validation
const validateForm = () => {
  const errors = {};
  // Validation logic
  setErrors(errors);
  return Object.keys(errors).length === 0;
};
```

### 📱 User Feedback
- **Loading States**: Visual feedback during operations
- **Success Messages**: Confirmation for successful actions
- **Error Messages**: Clear error descriptions
- **Progress Indicators**: Upload progress and calculations

## Security Considerations

### 🔒 Security Features
- **Input Validation**: Client-side and server-side validation
- **File Upload Security**: File type and size restrictions
- **Password Security**: Strong password requirements
- **CSRF Protection**: Cross-site request forgery protection
- **XSS Prevention**: Input sanitization

### 🛡️ Data Protection
- **Sensitive Data**: Password fields properly handled
- **File Upload**: Secure file handling and storage
- **API Security**: Authenticated API calls
- **Session Management**: Secure session handling

## Testing

### 🧪 Testing Strategy
- **Unit Tests**: Component functionality testing
- **Integration Tests**: API integration testing
- **E2E Tests**: User workflow testing
- **Accessibility Tests**: Screen reader compatibility

### 📋 Test Cases
```typescript
// Example test cases
describe('ProfilePage', () => {
  test('loads user statistics', () => {});
  test('handles avatar upload', () => {});
  test('validates password change', () => {});
  test('displays achievements correctly', () => {});
  test('shows error messages', () => {});
});
```

## Browser Compatibility

### 🌐 Supported Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### 📱 Mobile Support
- **iOS Safari**: 14+
- **Chrome Mobile**: 90+
- **Samsung Internet**: 14+

## Future Enhancements

### 🚀 Planned Features
- **Social Features**: Friend system and social sharing
- **Advanced Analytics**: Detailed performance insights
- **Customization**: Theme and layout customization
- **Notifications**: Real-time notifications
- **Export Features**: Data export functionality

### 🔧 Technical Improvements
- **Performance**: Further optimization and caching
- **Accessibility**: Enhanced screen reader support
- **Internationalization**: Multi-language support
- **Offline Support**: Progressive Web App features

## Contributing

### 🤝 Development Guidelines
1. Follow TypeScript best practices
2. Maintain consistent code style
3. Write comprehensive tests
4. Update documentation
5. Follow accessibility guidelines

### 📝 Code Standards
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **React Hooks**: Modern React patterns

## Support

### 📞 Getting Help
- **Documentation**: Check this README first
- **Issues**: Report bugs via GitHub issues
- **Discussions**: Use GitHub discussions for questions
- **Code Review**: Submit pull requests for review

---

*Last updated: December 2024*