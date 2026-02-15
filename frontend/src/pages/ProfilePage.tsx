import React from 'react';
import './ProfilePage.css';

interface ProfilePageProps {
  user: any;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  if (!user) {
    return (
      <div className="profile-page">
        <div className="page-container">
          <h2>No User Found</h2>
          <p>Please login to view your profile.</p>
        </div>
      </div>
    );
  }

  const { profile, email, createdAt } = user;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>My Account</h1>

        <div className="profile-card">
          <div className="profile-avatar">
            <span role="img" aria-label="user">
              👤
            </span>
          </div>

          <div className="profile-info">
            <div className="profile-row">
              <span className="label">Name:</span>
              <span className="value">{profile?.firstName} {profile?.lastName}</span>
            </div>

            <div className="profile-row">
              <span className="label">Email:</span>
              <span className="value">{email}</span>
            </div>

            <div className="profile-row">
              <span className="label">Member Since:</span>
              <span className="value">{new Date(createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
