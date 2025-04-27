# LOKAL-S Development Plan

## Project Overview

LOKAL-S is an on-demand platform for tech services (web development, app development, etc.) with an Uber-like e-hailing model. The platform connects clients with nearby tech service providers in real-time, featuring a neobrutalist design inspired by the LOKAL-S yellow and black logo stored in assets folder.

## Tech Stack

- **Frontend**: 
  - Vite + React
  - React Router for routing
  - Tailwind CSS (for neobrutalist styling)
  - Lucide React (for icons)

- **Backend**:
  - Supabase (PostgreSQL database with real-time capabilities)
  - Supabase Auth
  - Supabase Storage (for profile images and files)

- **Deployment**:
  - Netlify or Vercel (frontend)
  - Supabase Cloud (backend)

## Application Structure

### Core Features

1. **User Authentication**
   - Client/Developer registration and login 
   - Profile creation and management 
   - Session management 

2. **Real-time Service Matching**
   - Location-based service requests 
   - Developer discovery based on proximity and skills
   - Request notification system

3. **Service Management**
   - Request creation and details 
   - Service acceptance/rejection
   - Status tracking
   - Payment processing

4. **Real-time Communication**
   - In-app messaging between clients and developers
   - Push notifications

5. **Review and Rating System**
   - Post-service reviews
   - Developer ratings

## Current Database Schema (Supabase)

```sql
-- Users table
create table public.users (
  id uuid references auth.users not null primary key,
  email text not null unique,
  first_name text,
  last_name text,
  user_type text not null check (user_type in ('client', 'developer')),
  profile_image_url text,
  location geography(point),
  created_at timestamp with time zone default now(),
  last_active timestamp with time zone
);

-- Developer profiles
create table public.developer_profiles (
  id uuid primary key,
  user_id uuid references public.users not null,
  bio text,
  hourly_rate decimal,
  availability_status boolean default false,
  portfolio_url text,
  average_rating decimal default 0,
  total_jobs integer default 0
);

-- Skills table
create table public.skills (
  id serial primary key,
  name text not null unique,
  category text not null
);

-- Junction table for developer skills
create table public.developer_skills (
  developer_id uuid references public.developer_profiles not null,
  skill_id integer references public.skills not null,
  proficiency_level integer check (proficiency_level between 1 and 5),
  primary key (developer_id, skill_id)
);

-- Service requests
create table public.service_requests (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users not null,
  service_type text not null,
  description text,
  location geography(point),
  budget decimal,
  status text not null check (status in ('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'rejected')),
  created_at timestamp with time zone default now(),
  matched_developer_id uuid references public.users
);

-- Messages
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.service_requests not null,
  sender_id uuid references public.users not null,
  content text not null,
  timestamp timestamp with time zone default now(),
  read_status boolean default false
);

-- Reviews
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.service_requests not null unique,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone default now()
);
```

### Real-time Capabilities with Supabase

```javascript
// Enable row level security
alter table public.users enable row level security;
alter table public.developer_profiles enable row level security;
alter table public.service_requests enable row level security;
alter table public.messages enable row level security;

-- Set up real-time subscriptions
begin;
  -- Create publication for real-time
  create publication supabase_realtime for table 
    users, 
    developer_profiles, 
    service_requests, 
    messages;
commit;
```

## Route Structure (React Router)

### Client Side
1. **Authentication Routes**
   - `/login` - Login page
   - `/register` - Registration page 
   - `/profile` - Profile setup

2. **Main Client Flow**
   - `/` - Home page with map and nearby developers
   - `/request` - New service request form
   - `/request/:id` - Service request details and status
   - `/developers` - Browse available developers
   - `/developers/:id` - View developer profile

3. **Communication**
   - `/messages` - List of conversations
   - `/messages/:id` - Chat interface

### Developer Side
1. **Developer Dashboard**
   - `/developer` - Dashboard with status toggle
   - `/developer/requests` - Incoming and current requests
   - `/developer/earnings` - Earnings and payment info
   - `/developer/profile` - Profile management
   - `/developer/messages` - Messages with clients

## UI Components

### Neobrutalist Design System
- Bold black borders (3-4px)
- High contrast colors (primarily yellow from the logo)
- Raw, functional UI elements
- Oversized buttons and form elements

### Key Components
1. **Navigation**
   - Bottom navigation bar (mobile)
   - Side navigation (desktop)

2. **Map Interface**
   - Interactive map showing developers (using MapBox or Leaflet)
   - Location selector

3. **Service Request Components**
   - Service type selector
   - Budget slider
   - Project details form

4. **Developer Cards**
   - Profile thumbnail
   - Skills display
   - Rating and availability

5. **Chat Interface**
   - Message bubbles
   - Input area with attachments

## Development Phases

### Phase 1: Setup and Authentication
- Project initialization with Vite
- Supabase setup and schema creation
- Authentication flows
- Basic profile management

### Phase 2: Core Features
- Service request creation
- Developer discovery
- Location tracking
- Basic matching logic

### Phase 3: Real-time Features
- Real-time location updates
- Chat system implementation
- Push notifications
- Status updates

### Phase 4: UI/UX Implementation
- Implement neobrutalist design system
- Responsive layouts
- Map integration
- Interactive components

### Phase 5: Payment and Reviews
- Payment gateway integration
- Review and rating system
- Reporting functionality

### Phase 6: Testing and Optimization
- Performance optimization
- Security auditing
- User testing
- Bug fixes

### Phase 7: Deployment
- Production deployment
- Monitoring setup
- Analytics implementation

## API Implementation (Supabase Client)

### Authentication
```javascript
// Authentication functions
export const signUp = async (email, password, userType) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (data.user) {
    // Create user profile
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      user_type: userType,
      created_at: new Date()
    });
  }
  
  return { data, error };
};

export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({
    email,
    password
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};
```

### Service Requests
```javascript
// Service request functions
export const createServiceRequest = async (requestData) => {
  return await supabase
    .from('service_requests')
    .insert({
      client_id: requestData.clientId,
      service_type: requestData.serviceType,
      description: requestData.description,
      location: `POINT(${requestData.longitude} ${requestData.latitude})`,
      budget: requestData.budget,
      status: 'pending'
    });
};

export const getNearbyDevelopers = async (latitude, longitude, radius = 10) => {
  // Using PostGIS to find developers within radius (in km)
  return await supabase.rpc('developers_within_distance', {
    lat: latitude,
    long: longitude,
    distance_km: radius
  });
};
```

### Messaging
```javascript
export const sendMessage = async (requestId, senderId, content) => {
  return await supabase
    .from('messages')
    .insert({
      request_id: requestId,
      sender_id: senderId,
      content,
      timestamp: new Date(),
      read_status: false
    });
};

export const getMessages = async (requestId) => {
  return await supabase
    .from('messages')
    .select('*')
    .eq('request_id', requestId)
    .order('timestamp', { ascending: true });
};
```

## Real-time Implementation

### Location Tracking
```javascript
const setupLocationTracking = (userId) => {
  // Set up geolocation watcher
  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      await supabase
        .from('users')
        .update({
          location: `POINT(${longitude} ${latitude})`,
          last_active: new Date()
        })
        .eq('id', userId);
    },
    (error) => console.error(error),
    { enableHighAccuracy: true, maximumAge: 15000 }
  );
  
  return () => navigator.geolocation.clearWatch(watchId);
};
```

### Real-time Chat
```javascript
const subscribeToChat = (requestId, setMessages) => {
  const channel = supabase
    .channel(`chat:${requestId}`)
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` }, 
        payload => {
          setMessages(prev => [...prev, payload.new]);
        })
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
```

### Service Request Updates
```javascript
const subscribeToRequestUpdates = (requestId, setRequest) => {
  const channel = supabase
    .channel(`request:${requestId}`)
    .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${requestId}` }, 
        payload => {
          setRequest(payload.new);
        })
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
```

## Testing Strategy

### Unit Testing (Vitest)
- Component tests with React Testing Library
- Utility function tests
- API client tests

### Integration Testing
- User flows
- Real-time communication
- Authentication processes

### E2E Testing (Cypress)
- Complete user journeys
- Cross-browser compatibility
- Mobile responsiveness

## Project Structure

```
/src
  /assets - Static assets and images
  /components
    /ui - Reusable UI components
    /layout - Layout components
    /forms - Form components
    /maps - Map-related components
    /chat - Chat components
  /contexts - React contexts
  /hooks - Custom hooks
  /lib
    /supabase - Supabase client
    /geolocation - Geolocation utils
    /validation - Form validation
  /pages - Page components
    /auth - Authentication pages
    /client - Client pages
    /developer - Developer pages
    /shared - Shared pages
  /routes - Route definitions
  /services - API services
  /store - State management
  /styles - Global styles
  /types - TypeScript types
  /utils - Utility functions
  main.jsx - Entry point
  App.jsx - Root component
```

## Deployment Checklist

- Configure production Supabase instance
- Set up environment variables
- Configure Netlify/Vercel deployment
- Set up domain and SSL
- Implement monitoring and error tracking
- Configure backup strategy
- Set up CI/CD pipeline

## Future Enhancements

- Advanced matching algorithm
- Subscription model for premium features
- In-app video calls
- Team collaboration features
- Project management tools
- Milestone-based payments
- Dispute resolution system
- AI-powered service recommendations