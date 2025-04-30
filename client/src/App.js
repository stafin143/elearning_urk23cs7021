// client/src/App.js - Modified version with proper registration flow and course registration
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Login Component
function Login({ setAuth }) {
  const [inputs, setInputs] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const location = useLocation();

  const { email, password } = inputs;

  useEffect(() => {
    // Check if we have a success message from registration
    if (location.state && location.state.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const onChange = e => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const onSubmitForm = async e => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setAuth(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error logging in');
      console.error(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="text-center my-5">Login</h1>
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmitForm}>
        <div className="form-group mb-3">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={onChange}
            className="form-control"
            placeholder="Enter email"
            required
          />
        </div>
        <div className="form-group mb-3">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={onChange}
            className="form-control"
            placeholder="Enter password"
            required
          />
        </div>
        <button className="btn btn-primary btn-block w-100">Login</button>
      </form>
      <div className="mt-3 text-center">
        Don't have an account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}

// Register Component
function Register() {
  const [inputs, setInputs] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { username, email, password } = inputs;

  const onChange = e => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const onSubmitForm = async e => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password
      });
      
      if (response.data) {
        // Instead of storing the token and setting auth to true,
        // navigate to login with a success message
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please login with your credentials.' 
          } 
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering account');
      console.error(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="text-center my-5">Register</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmitForm}>
        <div className="form-group mb-3">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={username}
            onChange={onChange}
            className="form-control"
            placeholder="Enter username"
            required
          />
        </div>
        <div className="form-group mb-3">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={onChange}
            className="form-control"
            placeholder="Enter email"
            required
          />
        </div>
        <div className="form-group mb-3">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={onChange}
            className="form-control"
            placeholder="Enter password"
            required
          />
        </div>
        <button className="btn btn-primary btn-block w-100">Register</button>
      </form>
      <div className="mt-3 text-center">
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}

// Dashboard Component with Course Registration Features
function Dashboard({ setAuth }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    courseTitle: ''
  });
  
  // Course data
  const courses = [
    {
      id: 1,
      title: "Introduction to Web Development",
      description: "Learn the basics of HTML, CSS, and JavaScript",
      progress: 75
    },
    {
      id: 2,
      title: "React Fundamentals",
      description: "Master the core concepts of React.js",
      progress: 40
    },
    {
      id: 3,
      title: "Node.js Backend Development",
      description: "Build powerful backend applications with Node.js",
      progress: 10
    },
    {
      id: 4,
      title: "Advanced JavaScript",
      description: "Dive deep into JavaScript concepts like closures, promises, and async/await",
      progress: 60
    },
    {
      id: 5,
      title: "Database Design & SQL",
      description: "Learn to design efficient databases and write complex SQL queries",
      progress: 25
    },
    {
      id: 6,
      title: "Python for Data Science",
      description: "Use Python for data analysis, visualization, and machine learning",
      progress: 0
    },
    {
      id: 7,
      title: "UI/UX Design Principles",
      description: "Create user-friendly interfaces and enhance user experience",
      progress: 15
    },
    {
      id: 8,
      title: "DevOps & CI/CD",
      description: "Learn continuous integration and deployment best practices",
      progress: 0
    }
  ];

  const getProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/auth/user', {
        headers: { 'x-auth-token': token }
      });
      
      setName(response.data.username);
      setLoading(false);
    } catch (err) {
      console.error(err.message);
      setLoading(false);
    }
  };

  const registerForCourse = (courseId, courseTitle) => {
    // Here you would typically make an API call to register for the course
    console.log(`Registering for course ID: ${courseId}`);
    
    // Show notification
    setNotification({
      show: true,
      message: `You have registered for this course!`,
      courseTitle: courseTitle
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({
        show: false,
        message: '',
        courseTitle: ''
      });
    }, 3000);
  };

  const logout = e => {
    e.preventDefault();
    localStorage.removeItem('token');
    setAuth(false);
  };

  useEffect(() => {
    getProfile();
  }, []);

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="text-center mt-5">E-Learning Dashboard</h1>
      
      {/* Notification Alert */}
      {notification.show && (
        <div className="alert alert-success notification-alert" role="alert">
          <strong>{notification.courseTitle}</strong>: {notification.message}
        </div>
      )}
      
      <div className="p-4 welcome-box">
        <h2>Welcome, {name}!</h2>
        <p>This is your e-learning dashboard where you can access your courses and learning materials.</p>
        
        <div className="course-section">
          <h3>Available Courses</h3>
          <div className="row">
            {courses.map(course => (
              <div className="col-md-4 mb-4" key={course.id}>
                <div className="course-card">
                  <h4>{course.title}</h4>
                  <p>{course.description}</p>
                  <div className="progress mb-2">
                    <div 
                      className="progress-bar" 
                      role="progressbar" 
                      style={{width: `${course.progress}%`}} 
                      aria-valuenow={course.progress} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                      {course.progress}%
                    </div>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => registerForCourse(course.id, course.title)}
                  >
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-danger mt-4" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token is valid
          await axios.get('http://localhost:5000/api/auth/user', {
            headers: { 'x-auth-token': token }
          });
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Token verification failed:', err.message);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
    };
    
    checkAuth();
  }, []);

  const setAuth = (boolean) => {
    setIsAuthenticated(boolean);
  };

  return (
    <Router>
      <div className="container">
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? (
              <Login setAuth={setAuth} />
            ) : (
              <Navigate to="/dashboard" />
            )} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? (
              <Register />
            ) : (
              <Navigate to="/dashboard" />
            )} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? (
              <Dashboard setAuth={setAuth} />
            ) : (
              <Navigate to="/login" />
            )} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;