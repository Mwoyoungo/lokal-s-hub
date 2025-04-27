export interface ServiceMeta {
  id: string;
  name: string;
  description: string;
  bullets: string[];
  priceRange: [number, number];
}

export interface CategoryMeta {
  id: string;
  name: string;
  description: string;
  services: ServiceMeta[];
}

export const categories: CategoryMeta[] = [
  {
    id: 'web',
    name: 'Website Development',
    description: 'Websites, web applications, and online stores',
    services: [
      {
        id: 'custom_system',
        name: '💻 Custom System',
        description: 'You Explain It, We Build It. Something unique or more complex',
        bullets: [
          'You tell us what you need',
          'Custom admin panel, integrations, features',
          '“I have an idea — I just need someone to build it.”'
        ],
        priceRange: [3200, 5000]
      },
      {
        id: 'basic_info',
        name: '🔤 Basic Info Website',
        description: 'No Login, Just Content. A clean website that shares information about your business',
        bullets: [
          'Home, About, Contact',
          'Perfect for portfolios, personal brands, and local businesses',
          '“I just want people to find me and read about my services.”'
        ],
        priceRange: [1200, 2000]
      }
    ]
  },
  {
    id: 'app',
    name: 'App Development',
    description: 'Mobile applications for iOS and Android',
    services: [
      {
        id: 'custom_app',
        name: '🔧 Custom App Idea',
        description: 'Unique app idea? Let’s build it from zero',
        bullets: [
          'Tell us the concept, we design and develop',
          'Built for startups and innovators',
          '“This idea’s different — I need pros to bring it to life.”'
        ],
        priceRange: [4200, 5000]
      },
      {
        id: 'simple_utility',
        name: '🧰 Simple Utility App',
        description: 'One-screen apps to do one job',
        bullets: [
          'To-do lists • Reminders • Notes',
          'Great for personal tools or proof of concept',
          '“I just want something quick and useful.”'
        ],
        priceRange: [2500, 4000]
      },
      {
        id: 'location_app',
        name: '🗺️ Location-Based App',
        description: 'Track, find, or match people by location',
        bullets: [
          'Maps • Nearby users • Real-time updates',
          'Great for delivery, marketplaces, or services like Lokal S',
          '“My app idea needs maps and live locations.”'
        ],
        priceRange: [6000, 10000]
      }
    ]
  }
];
