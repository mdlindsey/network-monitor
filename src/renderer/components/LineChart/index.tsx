import { CSSProperties } from 'react'
import { Chart } from 'react-charts'

const LineChart = ({ values, style }:{ values: number[], style?: CSSProperties }) => {
    if (!values?.length) {
        return null
    }
    return (
        <div style={{ width: 600, height: 400, ...(style||{}), position: 'relative' }}>
            <Chart
                options={{
                    primaryAxis: { getValue: d => d.primary },
                    secondaryAxes: [{ getValue: d => d.secondary }],
                    data: [ { data: values.map((v,i) => ({ primary: i, secondary: v })) } ]
                }}
            />
        </div>
    )
}

export default LineChart
