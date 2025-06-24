import React from 'react'
import { Link } from "react-router-dom";
import BannerImage from "../assets/vdgroupphotousadc.png";
import "../styles/Home.css";

function Home() {
  return (
    <div className='home'>
        <div className='homeTop' style={{ backgroundImage: `url(${BannerImage})` }}></div>
        <div className='homeBottom'>
          <div className='homeContent'>
            <h1 className='name'>VIOLET DIABOLO</h1>
            <p className='description'>PREMIER DIABOLO TEAM AT NYU</p>
          </div>
        </div>
        <div className='homeFormsContent'>
          <h1>FORMS</h1>
          <div className='homeForms'>
            <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdqk-vvGryB5SCO2AM-iL2FXDi_2MNJHLJxnyxeckUNRoRzgw/viewform?embedded=true" width="640" height="1000" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
            <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdGVUpii4Viiv3EPtoDtXCyk9l7dxhbi3pINhJiN_KLiIwT4g/viewform?embedded=true" width="640" height="1000" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>          
          </div>
        </div>
    </div>
  )
}

export default Home