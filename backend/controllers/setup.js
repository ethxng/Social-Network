jest.mock('passport', () => {
    const passport = require('passport');
    const LocalStrategy = require('passport-local').Strategy;
    
    // Mock the passport local strategy
    // passport.use(new LocalStrategy({/* strategy options */}, (username, password, done) => {
    //   // Mock the authentication logic here based on your test scenario
    //   if (username === 'validuser' && password === 'validpassword') {
    //     const user = { id: 123, username: 'validuser' };
    //     return done(null, user);
    //   } else {
    //     return done(null, false, { message: 'Invalid credentials' });
    //   }
    // }));

    passport.use(new LocalStrategy((username, password, done) => {
        if (username === 'validuser' && password === 'validpassword') {
            const user = {id: 123, username: 'validuser'};
            return done(null, user);
        } else {
            return done(null, false, {message: "invalid credentials"});
        }
    }))
  
    // Mock passport initialize and session
    passport.initialize = jest.fn().mockReturnValue((req, res, next) => next());
    passport.session = jest.fn().mockReturnValue((req, res, next) => next());
  
    // Mock serializeUser and deserializeUser
    passport.serializeUser = jest.fn((user, done) => {
      done(null, user);
    });
  
    passport.deserializeUser = jest.fn((obj, done) => {
      const user = { obj, username: 'validuser' };
      done(null, obj);
    });
  
    return passport;
  });
  