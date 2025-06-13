import React from 'react'
import "../styles/About.css"
import BannerImage from "../assets/usadcphoto.png"

function About() {
  return (
    <div className='about'>
        <div className='aboutTop' style={{ backgroundImage: `url(${BannerImage})` }}></div>
        <div className='aboutBottom'>
          <div className='aboutContent'>
            <h1>ABOUT US</h1>
            <p>
                Founded in the Spring of 2019, Violet Diabolo is NYU’s award-winning Chinese Yo-Yo team. Adopting this traditional recreational pastime and blending it with energetic contemporary music, Violet Diabolo aims to promote AAPI culture through showcasing their unique performing art. The club has been invited to perform on Gordon Ramsey’s Hell’s Kitchen and has dazzled major crowds at hundreds of other teaching engagements and performances at major galas, festivals, non-profit events, schools, and fundraisers throughout the tri-state area.
            </p>
          </div>
        </div>
    </div>
  )
}

export default About