import React from 'react'
import { Link } from "react-router-dom";
import BannerImage from "../assets/vdgroupphotousadc.png";
import "../styles/Home.css";

function Home() {
  return (
    <div className='home' style={{ backgroundImage: `url(${BannerImage})` }}>
      <div className='headerContainer'>
        <h1>VIOLET DIABOLO</h1>
        <p>PREMIER DIABOLO TEAM AT NYU</p>
      </div>
    </div>
  )
}

export default Home