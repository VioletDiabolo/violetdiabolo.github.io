import React, { useState, useEffect, useRef } from 'react'
import Logo from '../assets/logo.png'
import { Link } from 'react-router-dom'
import ReorderIcon from '@mui/icons-material/Reorder';
import "../styles/Navbar.css";

function Navbar() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const menuRef = useRef(null);

    const toggleDropdown = () => {
        setIsDropdownOpen(prev => !prev);
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsDropdownOpen(false);
        }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isDropdownOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [isDropdownOpen]);
    
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 600) {
                setIsDropdownOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

  return (
    <div className='navbar'>
        <div className='leftSide'>
            <img src={Logo} alt="logo" />
        </div>
        <div className='rightSide' ref={menuRef}>
            <div className='menu' onClick={toggleDropdown}>
                <ReorderIcon />
            </div>
            <div className={`dropdownLinks ${isDropdownOpen ? "open" : ""}`}>
                <Link to="/" onClick={() => setIsDropdownOpen(false)}> Home </Link>
                <Link to="/board" onClick={() => setIsDropdownOpen(false)}> Board </Link>
                <Link to="/media" onClick={() => setIsDropdownOpen(false)}> Media </Link>
                <Link to="/contact" onClick={() => setIsDropdownOpen(false)}> Contact </Link>
            </div>
            <div className="fullLinks">
                <Link to="/">Home</Link>
                <Link to="/board">Board</Link>
                <Link to="/media">Media</Link>
                <Link to="/contact">Contact</Link>
                </div>
        </div>
    </div>
  )
}

export default Navbar