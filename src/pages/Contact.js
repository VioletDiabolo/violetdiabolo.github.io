import React from 'react'
import "../styles/Contact.css"
import BannerImage from "../assets/usadcphoto.png"

function Contact() {
  return (
    <div className='contact'>
        <div className='contactTop' style={{ backgroundImage: `url(${BannerImage})` }}></div>
        <div className='contactBottom'>
          <div className='contactContent'>
              <h1 className='contactTitle'>CONTACT US</h1>
              <p className='contactInfo'>
                  Reach out to <a href='mailto:violetdiabolo@gmail.com'>violetdiabolo@gmail.com</a> to contact us! <br />
                  Also check out our <a href='https://linktr.ee/violetdiabolo'>Linktree</a> and our socials at the bottom of the page!
              </p>
          </div>
        </div>
    </div>
  )
}

export default Contact