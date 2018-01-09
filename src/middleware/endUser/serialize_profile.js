export default function(profile) {
  return {
    _id: profile._id,
    username: profile.username,
    email: profile.email,
    registered: profile.registered,
    verified: profile.verified,
    role: profile.role,
    avatar: profile.avatar,
    gender: profile.gender,
    firstname: profile.firstname,
    lastname: profile.lastname,
    bio: profile.bio
  }
}
