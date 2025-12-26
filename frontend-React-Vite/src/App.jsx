import { useState } from 'react'
import './App.css'
import HouseCard from './Components/Props/HouseCard/HouseCard'

function App() {
    const apiScratch= 'http://localhost:3001/api/scrape'
    const [loading, setLoading] = useState(false);
    const [houses, setHouses] = useState([]);
    const searchHouses = async () => {
        setLoading(true);
        try{
            const response = await fetch(apiScratch);
            if (!response.ok) throw new Error ('Server error');
            const data = await response.json();
            if (data.success) {
                setHouses(data.houses);
            }
        }catch (error) {
            console.error('Scanning error:', error.message);
        }finally {
            setLoading(false);
        }

    }
    const convertPrice = (price) => {
        const number = parseFloat(price.replace(/[^\d.]/g, ''))
        return (number * 10000 + '¥')
    }

  return (
    <>
        <h1>Recherche de Maison</h1>
        <button onClick={searchHouses}>Rechercher</button>
        {loading && <p>Loading...</p>}
        <div className='searchResult'>
        {houses.map((house) =>
            <HouseCard key={house} Link={house.url} Title={house.title} Img={house.image} Price={convertPrice(house.price)} Source={house.source} />
        )}
</div>
    </>
  )
}

export default App
