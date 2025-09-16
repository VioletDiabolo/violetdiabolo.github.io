import React from 'react'
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
        <div className='homeAbout'>
          <div className='homeAboutContent'>
            <h1>ABOUT US</h1>
            <p>
                Founded in the Spring of 2019, Violet Diabolo is NYU’s award-winning Chinese Yo-Yo team. Adopting this traditional recreational pastime and blending it with energetic contemporary music, Violet Diabolo aims to promote AAPI culture through showcasing their unique performing art. The club has been invited to perform on Gordon Ramsey’s Hell’s Kitchen and has dazzled major crowds at hundreds of other teaching engagements and performances at major galas, festivals, non-profit events, schools, and fundraisers throughout the tri-state area.
            </p>
          </div>
        </div>
        <div className='homeEvents'>
          <div className='homeEventsContent'>
            <h1>EVENTS</h1>
            <p>
                Practices are on Saturdays from 1-3PM at Kimmel 606! Our first practice will be on September 20. All equipment will be provided, and anyone is welcome, regardless of experience!
            </p>
          </div>
        </div>
        <div className='homeFormsContent'>
          <h1>FORMS</h1>
          <div className='homeForms'>
            <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdqk-vvGryB5SCO2AM-iL2FXDi_2MNJHLJxnyxeckUNRoRzgw/viewform?embedded=true" width="640" height="1000" frameborder="0" marginheight="0" marginwidth="0" title="Performance/Teaching Request">Loading…</iframe>
            <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdGVUpii4Viiv3EPtoDtXCyk9l7dxhbi3pINhJiN_KLiIwT4g/viewform?embedded=true" width="640" height="1000" frameborder="0" marginheight="0" marginwidth="0" title="Interest Form">Loading…</iframe>          
          </div>
        </div>
    </div>
  )
}

export default Home