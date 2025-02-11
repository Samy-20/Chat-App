import './App.css';
import Dashboard from './modules/Dashboard';
import Form from './modules/Form';
import { Routes, Route, Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, auth = false }) => {
  const isLoggedIn = localStorage.getItem('user:token') !== null;

  // If the route requires authentication and the user is not logged in
  if (auth && !isLoggedIn) {
    return <Navigate to="/users/sign_in" />;
  }

  // If the user is logged in and tries to access sign-in or sign-up pages
  if (isLoggedIn && ['/users/sign_in', '/users/sign_up'].includes(window.location.pathname)) {
    return <Navigate to="/" />;
  }

  return children; // Render the children if no conditions are met
};

function App() {
  return (
    <Routes>
      <Route path='/' element={
        <ProtectedRoute auth={true}>
          <Dashboard/>
        </ProtectedRoute>
      } />
      <Route path='/users/sign_in' element={
      <ProtectedRoute>
        <Form isSignInPage={true}/>
      </ProtectedRoute>
      } />
      <Route path='/users/sign_up' element={
        <ProtectedRoute>
        <Form isSignInPage={false}/>
      </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;