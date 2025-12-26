import React from 'react'
import './HouseCard.css'

const HouseCard = ({Link, Title, Price, Source, Img}) => {
    return(
        <>
        <div className='house-card' onClick={Link}>
            <img className='imgHouse' src={Img} alt={Title}/>
            <p>{Title}</p>
            <p>{Price}</p>
            <p>{Source}</p>

        </div>
        </>
    );

};

export default HouseCard;