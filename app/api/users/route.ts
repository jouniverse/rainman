import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/options';
import { User } from '@/models/User';
import connectDB from '@/lib/db';

// Get user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Error fetching user' },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updates = await req.json();
    
    // Create two objects - one for filtered updates and one for fields to unset
    const allowedUpdates = ['username', 'password', 'email', 'state', 'city', 'zip', 'street', 'lat', 'lng'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        // Only include password if it's not empty
        if (key === 'password' && !updates[key]) {
          return obj;
        }
        
        // Handle null or undefined values for lat/lng (explicitly removing them)
        if ((key === 'lat' || key === 'lng') && (updates[key] === null || updates[key] === undefined || updates[key] === '' || String(updates[key]).trim() === '')) {
          // Don't add to filtered updates, will handle separately
          return obj;
        } else if (key === 'lat' || key === 'lng') {
          // Ensure lat/lng values are numbers
          const numValue = typeof updates[key] === 'string' ? parseFloat(updates[key]) : updates[key];
          // Only set if it's a valid number
          if (!isNaN(numValue)) {
            obj[key] = numValue;
          }
        } else {
          obj[key] = updates[key];
        }
        
        return obj;
      }, {} as Record<string, unknown>);

    // Construct an unset operation for empty fields
    const unsetFields: Record<string, boolean> = {};
    
    // Check lat/lng fields
    if ((updates.lat === null || updates.lat === undefined || updates.lat === '' || String(updates.lat).trim() === '')) {
      unsetFields.lat = true;
    }
    if ((updates.lng === null || updates.lng === undefined || updates.lng === '' || String(updates.lng).trim() === '')) {
      unsetFields.lng = true;
    }
    
    // Check address fields
    ['state', 'city', 'zip', 'street'].forEach(field => {
      if (updates[field] === null || updates[field] === undefined || updates[field] === '' || 
          (typeof updates[field] === 'string' && updates[field].trim() === '')) {
        unsetFields[field] = true;
        // Remove from filteredUpdates to avoid conflicts
        delete filteredUpdates[field];
      }
    });

    await connectDB();
    
    // Build update operations
    interface UpdateOperations {
      $set?: Record<string, unknown>;
      $unset?: Record<string, boolean>;
    }
    
    const updateOperations: UpdateOperations = {};
    
    // Only add $set if there are fields to set
    if (Object.keys(filteredUpdates).length > 0) {
      updateOperations.$set = filteredUpdates;
    }
    
    // Only add $unset if there are fields to unset
    if (Object.keys(unsetFields).length > 0) {
      updateOperations.$unset = unsetFields;
    }
    
    const user = await User.findByIdAndUpdate(
      session.user.id,
      updateOperations,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Error updating user' },
      { status: 500 }
    );
  }
}

// Delete user account
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findByIdAndDelete(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Set cookie to expire to log the user out
    const response = NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );

    // Clear authentication cookies
    response.cookies.set('next-auth.session-token', '', { 
      expires: new Date(0),
      path: '/'
    });
    
    // Also clear the CSRF token
    response.cookies.set('next-auth.csrf-token', '', {
      expires: new Date(0),
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Error deleting user' },
      { status: 500 }
    );
  }
} 