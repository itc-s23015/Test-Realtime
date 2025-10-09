'use client';

import {useRouter} from "next/navigation";

export default function Page() {
    const router = useRouter();

    const handleStart = () => {
        router.push('/room');
    };

    return (
        <button onClick={handleStart}>start</button>
    )
}