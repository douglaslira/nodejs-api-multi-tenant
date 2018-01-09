export default function(profile) {
  return {
    _id: profile._id,
    email: profile.email,
    firstname: profile.firstname,
    lastname: profile.lastname,
    registered: profile.registered
  }
}
