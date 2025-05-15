"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface UserData {
  username?: string | null;
  password?: string | null;
  email?: string | null;
  state?: string | null;
  city?: string | null;
  zip?: string | null;
  street?: string | null;
  lat?: number | null;
  lng?: number | null;
  [key: string]: string | number | null | undefined;
}

export default function AccountForm() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await response.json();
      setUserData(data);
      console.log('Fetched user data:', data); // Debug log
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Get values with proper null/empty handling
    const updates: UserData = {};
    
    // Process each field and only include non-empty values
    const fields = ['username', 'password', 'email', 'state', 'city', 'zip', 'street', 'lat', 'lng'];
    
    for (const field of fields) {
      const value = formData.get(field) as string;
      
      // Special handling for lat/lng
      if (field === 'lat' || field === 'lng') {
        if (value && value.trim() !== '') {
          const numVal = Number(value);
          if (!isNaN(numVal)) {
            updates[field] = numVal;
          } else {
            updates[field] = null;
          }
        } else {
          updates[field] = null; // Explicitly set to null to remove
        }
      } 
      // Handle all other fields
      else {
        // For address fields, empty strings should be set to null to remove them
        if (field === 'state' || field === 'city' || field === 'zip' || field === 'street') {
          updates[field] = value && value.trim() !== '' ? value : null;
        } else {
          // For username, password, email - only include if not empty
          if (value && value.trim() !== '') {
            updates[field] = value;
          }
        }
      }
    }

    console.log('Submitting updates:', updates);

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      console.log('Updated profile data:', data);
      
      setSuccess('Profile updated successfully');
      await fetchUserData();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Sign out on the client side to clear session
      await signOut({ redirect: false });
      
      // Redirect to homepage after successful deletion and signout
      router.push('/');
      router.refresh(); // Force a refresh of the page
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account');
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto p-6 bg-white/10 backdrop-blur-md shadow-2xl rounded-lg border us-white-border bg-black/30">
      {/* Current account information section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold us-white-text">Account Settings</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex justify-center py-2 px-4 bg-black text-white border border-white rounded hover:border-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-700"
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg">
            {success}
          </div>
        )}

        {!isEditing && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">Username</p>
                <p className="us-white-text">{userData.username || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">Email</p>
                <p className="us-white-text">{userData.email || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">State (e.g DC)</p>
                <p className="us-white-text">{userData.state || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">City</p>
                <p className="us-white-text">{userData.city || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">ZIP Code</p>
                <p className="us-white-text">{userData.zip || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">Street</p>
                <p className="us-white-text">{userData.street || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">Latitude</p>
                <p className="us-white-text">{userData.lat !== undefined ? userData.lat : '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium us-white-text opacity-70">Longitude</p>
                <p className="us-white-text">{userData.lng !== undefined ? userData.lng : '-'}</p>
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium us-white-text">
                Username
              </label>
              <input
                type="text"
                name="username"
                id="username"
                defaultValue={userData.username || ''}
                className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium us-white-text">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder="Enter new password"
                className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium us-white-text">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                defaultValue={userData.email || ''}
                className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="state" className="block text-sm font-medium us-white-text">
                  State
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="state"
                    id="state"
                    defaultValue={userData.state || ''}
                    className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
                  />
                  {userData.state && (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('state') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="mt-1 ml-2 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                      title="Clear state"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium us-white-text">
                  City
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="city"
                    id="city"
                    defaultValue={userData.city || ''}
                    className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
                  />
                  {userData.city && (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('city') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="mt-1 ml-2 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                      title="Clear city"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="zip" className="block text-sm font-medium us-white-text">
                  ZIP Code
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="zip"
                    id="zip"
                    defaultValue={userData.zip || ''}
                    className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
                  />
                  {userData.zip && (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('zip') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="mt-1 ml-2 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                      title="Clear ZIP code"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="street" className="block text-sm font-medium us-white-text">
                  Street
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="street"
                    id="street"
                    defaultValue={userData.street || ''}
                    className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
                  />
                  {userData.street && (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('street') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="mt-1 ml-2 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                      title="Clear street"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="lat" className="block text-sm font-medium us-white-text">
                  Latitude <span className="text-xs opacity-70">(leave empty to remove)</span>
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    id="lat"
                    defaultValue={userData.lat !== null ? userData.lat : ''}
                    className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
                  />
                  {userData.lat !== null && userData.lat !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('lat') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="mt-1 ml-2 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                      title="Clear latitude value"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="lng" className="block text-sm font-medium us-white-text">
                  Longitude <span className="text-xs opacity-70">(leave empty to remove)</span>
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="any"
                    name="lng"
                    id="lng"
                    defaultValue={userData.lng !== null ? userData.lng : ''}
                    className="mt-1 block w-full border us-white-border shadow-sm focus:border-rose-700 focus:ring-rose-700 sm:text-sm us-white-text bg-black/30"
                  />
                  {userData.lng !== null && userData.lng !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('lng') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="mt-1 ml-2 py-1 px-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                      title="Clear longitude value"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 bg-black text-white border border-white rounded hover:border-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-700 disabled:opacity-50"
              >
                {isLoading ? <div className="loader-pixels"></div> : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex justify-center py-2 px-4 bg-rose-700 text-white border border-rose-700 rounded hover:border-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Account
              </button>
            </div>
          </form>
        )}
    </div>
  );
} 