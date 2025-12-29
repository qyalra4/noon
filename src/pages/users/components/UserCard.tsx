import React from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';

interface UserCardProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    country?: { name_ar: string };
    governorate?: { name_ar: string };
    area?: { name_ar: string };
  };
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  return (
    <div className="user-card">
      <div className="user-card-header">
        <div className="user-avatar">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
          ) : (
            <div className="avatar-placeholder">
              <User size={24} />
            </div>
          )}
        </div>
        <h3 className="user-namePage">{user.first_name} {user.last_name}</h3>
      </div>
      
      <div className="user-card-body">
        <div className="user-info-item">
          <Mail size={16} />
          <span>{user.email}</span>
        </div>
        
        {user.phone && (
          <div className="user-info-item">
            <Phone size={16} />
            <span>{user.phone}</span>
          </div>
        )}
        
        {(user.country || user.governorate || user.area) && (
          <div className="user-info-item">
            <MapPin size={16} />
            <span>
              {user.country?.name_ar} 
              {user.governorate && `, ${user.governorate.name_ar}`}
              {user.area && `, ${user.area.name_ar}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;