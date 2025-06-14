import React from 'react'
import "../styles/Contact.css"

function Contact() {
  return (
    <div className='contact'>
        <div className='contactContent'>
          <h1 className='contactTitle'>Contact Us</h1>
          <p className='contactInfo'>
              Reach out to <a href='mailto:violetdiabolo@gmail.com'>violetdiabolo@gmail.com</a> to contact us!
          </p>
          <div>
            <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdqk-vvGryB5SCO2AM-iL2FXDi_2MNJHLJxnyxeckUNRoRzgw/viewform?embedded=true" width="640" height="1000" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
            <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdGVUpii4Viiv3EPtoDtXCyk9l7dxhbi3pINhJiN_KLiIwT4g/viewform?embedded=true" width="640" height="1000" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>          
          </div>
        </div>
    </div>
  )
}

export default Contact