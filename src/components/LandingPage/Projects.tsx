import clsx from "clsx";
import CardSwap, { Card } from "../ReactBits/CardSwap";
import Sample01 from "../../assets/projects/sample01.png";
import Sample02 from "../../assets/projects/sample02.png";
import Sample03 from "../../assets/projects/sample03.png";
import Sample04 from "../../assets/projects/sample04.png";
import Sample05 from "../../assets/projects/sample05.png";
import Sample06 from "../../assets/projects/sample06.png";

interface StepProps {
  number: string;
  title: string;
  description: string;
  color: string;
  image?: string;
}

const Project = ({ number, title, description, color, image }: StepProps) => {
  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex gap-6 md:gap-10 items-start">
        <div
          className={clsx(
            "w-12 h-12 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center border-3 border-neu-border text-2xl md:text-3xl font-black shadow-neu text-neu-bg",
            color,
          )}
        >
          {number}
        </div>
        <div className="flex-1">
          <h3 className="text-2xl md:text-3xl font-black mb-2 uppercase text-neu-text line-clamp-1">
            {title}
          </h3>
          <p className="text-lg font-bold leading-relaxed text-neu-text/80 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
      {image && (
        <div className="mt-6 w-full h-48 md:h-64 border-3 border-neu-border shadow-neu overflow-hidden relative group">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-top transform transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-neu-text/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          </div>
        </div>
      )}
    </div>
  );
};

const Projects = () => {
  return (
    <section className="py-24 pl-0 pr-6 bg-neu-card border-b-3 border-neu-border w-full overflow-hidden">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-12 md:gap-0">
        <div className="w-full md:w-auto flex-shrink-0 flex justify-center md:justify-start -ml-4 md:-ml-8 mb-12 md:mb-0">
          <h2 className="text-5xl md:text-7xl font-black text-center md:text-left mb-0 bg-neu-bg border-3 border-neu-border border-l-0 inline-block py-4 pr-8 pl-8 shadow-neu-lg rotate-2 text-neu-text leading-tight whitespace-nowrap rounded-r-xl">
            HACK-PROJECTS
          </h2>
        </div>

        <div
          className="w-full flex-grow md:pl-12"
          style={{ height: "600px", position: "relative" }}
        >
          <CardSwap
            width="90%"
            height={400}
            cardDistance={60}
            verticalDistance={70}
            delay={4000}
            pauseOnHover={true}
            easing="linear"
            skewAmount={1}
            onCardClick={(idx) => {
              const urls = [
                "https://huggingface.co/spaces/CatInPajamas/food_not_food_text_classifier",
                "https://molab.marimo.io/github/ZGMFX20A-97/kaggle-rossmann-store-sales/blob/main/RossmannStoreSales.py",
                "https://github.com/ZGMFX20A-97/basic-CNN-model/blob/main/main.py",
                "https://pokemonpicturebook.web.app/",
                "https://discord-clone-7191b.web.app/",
                "https://reactnote-78734.web.app/",
              ];
              if (urls[idx]) window.open(urls[idx], "_blank");
            }}
          >
            <Card>
              <Project
                number="01"
                title="Food-not-food-text-classifier"
                description="Fine-tuned distilBERT model for text classification task."
                color="bg-neu-text"
                image={Sample01}
              />
            </Card>
            <Card>
              <Project
                number="02"
                title="Rossmann-Store-Sales"
                description="Forecast sales using store, promotion, and competitor data."
                color="bg-neu-pink"
                image={Sample02}
              />
            </Card>
            <Card>
              <Project
                number="03"
                title="basic-CNN-model"
                description="Basic CNN model trained with CIFAR10 dataset."
                color="bg-neu-lime"
                image={Sample03}
              />
            </Card>
            <Card>
              <Project
                number="04"
                title="Pokemon Picture Book"
                description="A book of Pokemon pictures."
                color="bg-neu-blue"
                image={Sample04}
              />
            </Card>
            <Card>
              <Project
                number="05"
                title="Discord-like App"
                description="A diacord-like app with real-time chat."
                color="bg-neu-purple"
                image={Sample05}
              />
            </Card>
            <Card>
              <Project
                number="06"
                title="Notebook App"
                description="A notebook app with real-time sync."
                color="bg-neu-yellow"
                image={Sample06}
              />
            </Card>
          </CardSwap>
        </div>
      </div>
    </section>
  );
};

export default Projects;
