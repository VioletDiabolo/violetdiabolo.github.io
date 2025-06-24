import React from 'react'
import "../styles/Contact.css"

function Contact() {
  return (
    <div className='contact'>
        <div className='contactContent'>
          <h1 className='contactTitle'>Contact Us</h1>
          <p className='contactInfo'>
              Reach out to <a href='mailto:violetdiabolo@gmail.com'>violetdiabolo@gmail.com</a> to contact us! <br />
              Also check out our <a href='https://linktr.ee/violetdiabolo'>Linktree</a> and our socials at the bottom of the page!
          </p>
        </div>
    </div>
  )
}

export default Contact