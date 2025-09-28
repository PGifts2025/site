// src/components/HeaderBar.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Search, ShoppingCart, User } from 'lucide-react';

const categories = [
  { name: 'Design Tool', path: '/designer' },
  { name: 'Cups', path: '/cups' },
  { name: 'Water Bottles', path: '/water-bottles' },
  { name: 'Bags', path: '/bags' },
  { name: 'Clothing', path: '/clothing' },
  { name: 'Hi Vis', path: '/hi-vis' },
  { name: 'Cables', path: '/cables' },
  { name: 'Power', path: '/power' },
  { name: 'Speakers', path: '/speakers' },
  { name: 'Pens & Writing', path: '/pens' },
  { name: 'Notebooks', path: '/notebooks' },
  { name: 'Tea Towels', path: '/tea-towels' },
];

function HeaderBar() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Header */}
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mr-4">
              PG
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Promo Gifts</h1>
              <p className="text-sm text-gray-600">YOUR PROMOTIONAL PARTNER</p>
              <div className="flex items-center mt-1">
                <Phone className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm font-semibold text-gray-700">01844 600900</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search product, brand, colour, keyword or code"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button className="absolute right-2 top-2 bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-gray-700 hover:text-red-500 transition-colors">
              <User className="h-6 w-6" />
              <span>My Account</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-700 hover:text-red-500 transition-colors">
              <ShoppingCart className="h-6 w-6" />
              <span>Basket</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex space-x-8">
              {categories.map((category, index) => (
                <Link
                  key={index}
                  to={category.path}
                  className="text-white hover:text-red-400 transition-colors text-sm font-medium"
                >
                  {category.name}
                </Link>
              ))}
            </div>
            <button className="text-white hover:text-red-400 transition-colors text-sm font-medium">
              More ☰
            </button>
          </div>
        </div>
      </nav>

      {/* Feature Bar */}
      <div className="bg-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center justify-between w-full space-x-8">
              <span className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">⭐</span>
                </div>
                <span>Best Sellers</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">24</span>
                </div>
                <span>Express Delivery</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">UK</span>
                </div>
                <span>Made in the UK</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">♻️</span>
                </div>
                <span>Eco-Friendly</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs">⚙️</span>
                </div>
                <span>Real-Time Proof</span>
              </span>
              <span className="text-orange-500 font-medium flex items-center space-x-1">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🆕</span>
                </div>
                <span>New Products</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;
