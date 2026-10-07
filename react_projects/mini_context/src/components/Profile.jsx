import React, { useContext } from 'react';
import UserContext from '../context/userContext';

function Profile() {
    const { user } = useContext(UserContext)

    if (!user) return <div>please Login</div>;
 
    return <div>Welocome: {user.username} </div>
}

export default Profile